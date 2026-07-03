declare module "heic-convert" {
  interface ConvertOptions {
    /** The HEIC/HEIF file bytes. */
    buffer: Buffer | Uint8Array | ArrayBuffer;
    /** Output encoding. */
    format: "JPEG" | "PNG";
    /** 0..1, JPEG only. */
    quality?: number;
  }
  /** Decode one HEIC/HEIF image and re-encode it. Returns the encoded bytes. */
  const convert: (options: ConvertOptions) => Promise<ArrayBuffer>;
  export default convert;
}
