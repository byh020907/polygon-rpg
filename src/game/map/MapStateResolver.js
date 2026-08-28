import { MapDefinition, deepFreeze, defineMap } from './MapDefinition.js';

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function cloneValue(value) {
  if (Array.isArray(value)) return value.map(cloneValue);
  if (!isRecord(value)) return value;
  return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, cloneValue(entry)]));
}

function readPath(source, path) {
  if (typeof path !== 'string' || path === '') return undefined;
  return path.split('.').reduce((value, key) => value?.[key], source);
}

function readFact(facts, path) {
  const direct = readPath(facts, path);
  if (direct !== undefined) return direct;
  if (path === 'time') return facts.timePhase;
  if (path === 'weather') return facts.weather;
  return undefined;
}

function readFlag(facts, flagName) {
  return (
    readPath(facts, `flags.${flagName}`) ??
    readPath(facts, `storyFlags.${flagName}`) ??
    readPath(facts, `questFlags.${flagName}`) ??
    readPath(facts, flagName) ??
    false
  );
}

function sameValue(left, right) {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) && Array.isArray(right)) {
    return (
      left.length === right.length && left.every((entry, index) => sameValue(entry, right[index]))
    );
  }
  if (isRecord(left) && isRecord(right)) {
    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);
    return (
      leftKeys.length === rightKeys.length &&
      leftKeys.every((key) => sameValue(left[key], right[key]))
    );
  }
  return false;
}

function compare(actual, operator, expected) {
  switch (operator) {
    case 'eq':
    case 'equals':
    case '==':
      return sameValue(actual, expected);
    case 'ne':
    case 'notEquals':
    case '!=':
      return !sameValue(actual, expected);
    case 'gt':
    case '>':
      return actual > expected;
    case 'gte':
    case '>=':
      return actual >= expected;
    case 'lt':
    case '<':
      return actual < expected;
    case 'lte':
    case '<=':
      return actual <= expected;
    case 'in':
      return Array.isArray(expected) && expected.some((entry) => sameValue(actual, entry));
    case 'notIn':
      return Array.isArray(expected) && !expected.some((entry) => sameValue(actual, entry));
    case 'includes':
      return Array.isArray(actual)
        ? actual.some((entry) => sameValue(entry, expected))
        : typeof actual === 'string' && actual.includes(String(expected));
    case 'exists':
      return expected ? actual !== undefined : actual === undefined;
    case 'truthy':
      return Boolean(actual) === (expected ?? true);
    default:
      throw new Error(`지원하지 않는 fact 비교 연산자입니다: ${operator}`);
  }
}

function evaluateFactCondition(condition, facts) {
  if (condition.flag !== undefined) {
    const actual = readFlag(facts, condition.flag);
    const expected = condition.value ?? condition.equals ?? condition.eq ?? true;
    return compare(actual, condition.operator ?? 'eq', expected);
  }
  if (condition.eq !== undefined && Array.isArray(condition.eq)) {
    return compare(readFact(facts, condition.eq[0]), 'eq', condition.eq[1]);
  }
  if (condition.ne !== undefined && Array.isArray(condition.ne)) {
    return compare(readFact(facts, condition.ne[0]), 'ne', condition.ne[1]);
  }
  if (condition.fact !== undefined) {
    const actual = readFact(facts, condition.fact);
    if (condition.operator) return compare(actual, condition.operator, condition.value);
    const operators = [
      'equals',
      'eq',
      'notEquals',
      'ne',
      'gt',
      'gte',
      'lt',
      'lte',
      'in',
      'notIn',
      'includes',
      'exists',
    ];
    const operator = operators.find((name) => Object.hasOwn(condition, name));
    return operator ? compare(actual, operator, condition[operator]) : Boolean(actual);
  }
  return Object.entries(condition).every(([path, expected]) =>
    isRecord(expected) && expected.operator
      ? compare(readFact(facts, path), expected.operator, expected.value)
      : sameValue(readFact(facts, path), expected),
  );
}

export function matchesMapCondition(condition, facts = {}) {
  if (condition === undefined || condition === null) return true;
  if (typeof condition === 'boolean') return condition;
  if (Array.isArray(condition))
    return condition.every((entry) => matchesMapCondition(entry, facts));
  if (!isRecord(condition)) throw new TypeError('map condition은 객체여야 합니다.');
  if (condition.all !== undefined) {
    if (!Array.isArray(condition.all)) throw new TypeError('condition.all은 배열이어야 합니다.');
    if (!condition.all.every((entry) => matchesMapCondition(entry, facts))) return false;
  }
  if (condition.any !== undefined) {
    if (!Array.isArray(condition.any)) throw new TypeError('condition.any는 배열이어야 합니다.');
    if (!condition.any.some((entry) => matchesMapCondition(entry, facts))) return false;
  }
  if (condition.not !== undefined && matchesMapCondition(condition.not, facts)) return false;
  const remaining = Object.fromEntries(
    Object.entries(condition).filter(([key]) => !['all', 'any', 'not'].includes(key)),
  );
  return Object.keys(remaining).length === 0 || evaluateFactCondition(remaining, facts);
}

function inferKind(path) {
  if (path.includes('.surfaces.')) return 'surface';
  if (path.includes('.renderItems.')) return 'renderItem';
  if (path.includes('.entities.')) return 'entity';
  if (path.includes('.triggers.')) return 'trigger';
  if (path.startsWith('connections.')) return 'connection';
  if (path.startsWith('spawns.')) return 'spawn';
  if (path.includes('.lanes.')) return 'lane';
  if (path.startsWith('chunks.')) return 'chunk';
  return 'map';
}

function collectTargets(root, locator) {
  const matches = [];
  const visit = (value, path, context) => {
    if (!isRecord(value) && !Array.isArray(value)) return;
    const kind = inferKind(path);
    const currentContext = { ...context };
    if (isRecord(value) && kind === 'chunk') currentContext.chunkId = value.id;
    if (isRecord(value) && kind === 'lane') currentContext.laneId = value.id;
    if (isRecord(value) && value.id !== undefined) {
      const stringMatch =
        typeof locator === 'string' && (value.id === locator || value.qualifiedId === locator);
      const objectMatch =
        isRecord(locator) &&
        (locator.id === undefined || locator.id === value.id || locator.id === value.qualifiedId) &&
        (locator.qualifiedId === undefined || locator.qualifiedId === value.qualifiedId) &&
        (locator.kind === undefined || locator.kind === kind) &&
        (locator.type === undefined || locator.type === kind) &&
        (locator.chunkId === undefined || locator.chunkId === currentContext.chunkId) &&
        (locator.laneId === undefined || locator.laneId === currentContext.laneId);
      if (stringMatch || objectMatch) matches.push(value);
    }
    if (Array.isArray(value)) {
      value.forEach((entry, index) => visit(entry, `${path}.${index}`, currentContext));
      return;
    }
    for (const [key, entry] of Object.entries(value)) {
      if (key === 'patches') continue;
      visit(entry, path ? `${path}.${key}` : key, currentContext);
    }
  };
  visit(root, '', {});
  return [...new Set(matches)];
}

function applyOperation(root, operation, patchId) {
  const targets = collectTargets(root, operation.target);
  if (targets.length === 0)
    throw new Error(
      `patch(${patchId}) 대상을 찾을 수 없습니다: ${JSON.stringify(operation.target)}`,
    );
  if (targets.length > 1 && typeof operation.target === 'string') {
    throw new Error(`patch(${patchId}) 대상 ID가 모호합니다: ${operation.target}`);
  }
  for (const target of targets) {
    switch (operation.op) {
      case 'set-enabled':
      case 'set-active-connection':
        target.enabled = operation.value ?? operation.enabled ?? !operation.disable;
        break;
      case 'set':
        target[operation.property] = cloneValue(operation.value);
        break;
      case 'override':
        Object.assign(target, cloneValue(operation.override));
        break;
      default:
        throw new Error(`지원하지 않는 map patch op입니다: ${operation.op}`);
    }
  }
}

export class MapStateResolver {
  constructor(definition) {
    this.definition = defineMap(definition);
  }

  matches(condition, facts = {}) {
    return matchesMapCondition(condition, facts);
  }

  resolve(facts = {}) {
    const resolved = this.definition.toObject();
    const activePatches = this.definition.patches
      .map((patch, index) => ({ patch, index }))
      .filter(({ patch }) => matchesMapCondition(patch.when, facts))
      .sort(
        (left, right) => left.patch.priority - right.patch.priority || left.index - right.index,
      );
    for (const { patch } of activePatches) {
      for (const operation of patch.operations) applyOperation(resolved, operation, patch.id);
    }
    resolved.appliedPatchIds = activePatches.map(({ patch }) => patch.id);
    return deepFreeze(resolved);
  }

  static matches(condition, facts = {}) {
    return matchesMapCondition(condition, facts);
  }

  static resolve(definition, facts = {}) {
    return new MapStateResolver(definition).resolve(facts);
  }
}

export function resolveMapState(definition, facts = {}) {
  if (definition instanceof MapDefinition) return new MapStateResolver(definition).resolve(facts);
  return MapStateResolver.resolve(definition, facts);
}
