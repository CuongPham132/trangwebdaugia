export function extractListData<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) {
    return payload as T[];
  }

  if (isRecord(payload) && Array.isArray(payload.data)) {
    return payload.data as T[];
  }

  if (isRecord(payload) && isRecord(payload.data) && Array.isArray(payload.data.data)) {
    return payload.data.data as T[];
  }

  if (isRecord(payload)) {
    return Object.values(payload).filter(isRecord) as T[];
  }

  return [];
}

export function extractObjectData<T>(payload: unknown): T | null {
  if (isRecord(payload) && isRecord(payload.data)) {
    return payload.data as T;
  }

  if (isRecord(payload)) {
    return payload as T;
  }

  return null;
}

const toPositiveNumber = (value: unknown): number | null => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
};

const extractIdFromRecord = (record: Record<string, unknown>): number | null => {
  const candidates = [
    record.id,
    record.product_id,
    record.productId,
    record.insertId,
    record.insert_id,
  ];

  for (const candidate of candidates) {
    const id = toPositiveNumber(candidate);
    if (id !== null) {
      return id;
    }
  }

  return null;
};

export function extractCreatedProductId(payload: unknown): number | null {
  if (!isRecord(payload)) {
    return null;
  }

  const directId = extractIdFromRecord(payload);
  if (directId !== null) {
    return directId;
  }

  const data = payload.data;
  if (isRecord(data)) {
    const dataId = extractIdFromRecord(data);
    if (dataId !== null) {
      return dataId;
    }

    const nestedData = data.data;
    if (isRecord(nestedData)) {
      const nestedId = extractIdFromRecord(nestedData);
      if (nestedId !== null) {
        return nestedId;
      }
    }
  }

  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
