// Writes src/generated/types.ts from spec/openapi.json.
//
// The spec uses a small JSON Schema subset (objects, arrays, enums, anyOf,
// $ref, nullable unions), so this walks it directly instead of depending on a
// general OpenAPI generator. Run `npm run generate` after the spec changes.

import { readFileSync, writeFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';

const SPEC_PATH = new URL('../spec/openapi.json', import.meta.url);
const OUT_PATH = new URL('../src/generated/types.ts', import.meta.url);

const spec = JSON.parse(readFileSync(SPEC_PATH, 'utf8'));
const components = spec.components.schemas;

const COMPONENT_NAMES = {
  Request: 'GenerationRequest',
  Error: 'ErrorBody',
  GenerateRequest: 'GenerateConfig',
};
const componentName = (name) => COMPONENT_NAMES[name] ?? name;

const MEDIA_TYPE_BY_TAG = {
  'Image models': 'image',
  'Video models': 'video',
  'Audio models': 'audio',
};

// The error code vocabulary grows within a version; clients treat an unknown
// code by its HTTP status, so every field holding one accepts any string.
const ERROR_CODES = components.Error.properties.error.properties.code.enum;

const pascalCase = (value) =>
  value
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join('');

const docComment = (text, indent) => {
  if (!text) return '';
  const lines = text.replace(/\*\//g, '*\\/').split('\n');
  if (lines.length === 1) return `${indent}/** ${lines[0]} */\n`;
  return `${indent}/**\n${lines.map((line) => `${indent} * ${line}`.trimEnd()).join('\n')}\n${indent} */\n`;
};

const propertyDoc = (schema) => {
  const parts = [];
  if (schema.description) parts.push(schema.description);
  if (schema.default !== undefined) {
    parts.push(`Default: \`${JSON.stringify(schema.default)}\`.`);
  }
  return parts.join(' ');
};

const literal = (value) => JSON.stringify(value).replace(/"/g, "'");

// Declarations are emitted in the order they are first reached.
const declarations = [];
const declared = new Set();

const componentFor = (schema) => {
  for (const [name, component] of Object.entries(components)) {
    if (isDeepStrictEqual(schema, component)) return componentName(name);
  }
  return null;
};

function typeOf(schema, nameHint) {
  if (schema.$ref) {
    return componentName(schema.$ref.replace('#/components/schemas/', ''));
  }
  if (schema.const !== undefined) return literal(schema.const);
  if (schema.enum && isDeepStrictEqual(schema.enum, ERROR_CODES)) {
    return 'ErrorCode | (string & {})';
  }
  if (schema.enum) return schema.enum.map(literal).join(' | ');
  if (schema.anyOf) {
    const objects = schema.anyOf.filter((member) => member.type === 'object');
    const types = schema.anyOf.map((member) => {
      const index = objects.indexOf(member);
      const hint =
        objects.length > 1 && index >= 0 ? `${nameHint}${index + 1}` : nameHint;
      return typeOf(member, hint);
    });
    return [...new Set(types)].join(' | ');
  }
  switch (schema.type) {
    case 'string':
      return 'string';
    case 'integer':
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'null':
      return 'null';
    case 'array': {
      const item = typeOf(schema.items ?? {}, `${nameHint}Item`);
      return item.includes(' ') ? `Array<${item}>` : `${item}[]`;
    }
    case 'object':
      return objectType(schema, nameHint);
    default:
      return 'unknown';
  }
}

function objectType(schema, nameHint) {
  if (!schema.properties) {
    const values = schema.additionalProperties;
    if (values && typeof values === 'object') {
      return `Record<string, ${typeOf(values, `${nameHint}Value`)}>`;
    }
    return 'Record<string, unknown>';
  }
  const existing = componentFor(schema);
  if (existing && existing !== nameHint) return existing;
  declareInterface(nameHint, schema);
  return nameHint;
}

function declareInterface(name, schema) {
  if (declared.has(name)) return;
  declared.add(name);
  const slot = declarations.length;
  declarations.push('');
  const required = new Set(schema.required ?? []);
  let body = '';
  for (const [property, propertySchema] of Object.entries(schema.properties)) {
    const type = typeOf(propertySchema, `${name}${pascalCase(property)}`);
    const optional = required.has(property) ? '' : '?';
    body += docComment(propertyDoc(propertySchema), '  ');
    body += `  ${property}${optional}: ${type};\n`;
  }
  if (schema.additionalProperties === true) {
    body += '  [key: string]: unknown;\n';
  }
  declarations[slot] =
    `${docComment(schema.description, '')}export interface ${name} {\n${body}}\n`;
}

for (const [name, schema] of Object.entries(components)) {
  declareInterface(componentName(name), schema);
}

const architectures = [];
for (const [path, operations] of Object.entries(spec.paths)) {
  const match = /^\/v1\/([a-z0-9_]+)\/generate$/.exec(path);
  if (!match) continue;
  const operation = operations.post;
  const id = match[1];
  const configName = `${pascalCase(id)}Config`;
  const schema = operation.requestBody.content['application/json'].schema;
  declareInterface(configName, {
    ...schema,
    description: `The config for ${operation.summary} (\`POST /v1/${id}/generate\`). ${operation.description}`,
  });
  const tag = operation.tags.find((candidate) => MEDIA_TYPE_BY_TAG[candidate]);
  architectures.push({
    id,
    configName,
    name: operation.summary,
    type: MEDIA_TYPE_BY_TAG[tag],
  });
}

const configMap = architectures
  .map(({ id, configName }) => `  ${id}: ${configName};\n`)
  .join('');
const catalog = architectures
  .map(
    ({ id, name, type }) =>
      `  ${id}: { name: ${literal(name)}, type: ${literal(type)} },\n`,
  )
  .join('');

const output = `// Generated from spec/openapi.json by scripts/generate.mjs. Do not edit.

/** The error codes this version of the SDK knows. */
export type ErrorCode = ${ERROR_CODES.map(literal).join(' | ')};

${declarations.join('\n')}
/** Each architecture's config, keyed by the id in its endpoint path. */
export interface ArchitectureConfigs {
${configMap}}

/** The id of an architecture this version of the SDK knows. */
export type ArchitectureId = keyof ArchitectureConfigs;

/** The architectures in the API reference this SDK was generated from. */
export const ARCHITECTURES = {
${catalog}} as const;
`;

writeFileSync(OUT_PATH, output);
