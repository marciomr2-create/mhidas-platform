const COMMON_UTF8_MOJIBAKE_MARKERS = /[\u00c2\u00c3\ufffd]/;

export function repairCommonUtf8Mojibake(value: string): string {
  if (!COMMON_UTF8_MOJIBAKE_MARKERS.test(value)) {
    return value;
  }

  const bytes = new Uint8Array(value.length);

  for (let index = 0; index < value.length; index += 1) {
    const codePoint = value.charCodeAt(index);

    if (codePoint > 0xff) {
      return value;
    }

    bytes[index] = codePoint;
  }

  try {
    const repaired = new TextDecoder("utf-8", { fatal: true }).decode(bytes);

    return repaired.includes("\ufffd") ? value : repaired;
  } catch {
    return value;
  }
}
