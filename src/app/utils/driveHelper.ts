import { getAuthHeader } from './tokenHelper';

export enum UploadTypes {
  SIMPLE = 1,
  SIMPLE_RESUMABLE = 2,
  RESUMABLE_CHUNKED = 3
}

const MB = 1024 * 1024;
const CHUNK_SIZE = 5 * MB;
const MAX_CHUNK_SIZE = 20 * MB;

export type ProgressCallback = (
  percentComplete: number,
  bufferPercentComplete: number
) => void;

export const getUploadType = (size: number) => {
  return size >= CHUNK_SIZE
    ? size >= MAX_CHUNK_SIZE
      ? UploadTypes.RESUMABLE_CHUNKED
      : UploadTypes.SIMPLE_RESUMABLE
    : UploadTypes.SIMPLE;
};

export const doSimpleUpload = async (file: File) => {
  try {
    const fileContent = await readFile(file);
    const form = new FormData();
    form.append(
      "metadata",
      new Blob(
        [
          JSON.stringify({
            name: file.name,
            mimeType: file.type,
            parents: ["root"]
          })
        ],
        { type: "application/json" }
      )
    );
    form.append("file", new Blob([fileContent], { type: file.type }));
    const result = await fetch(
      `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id`,
      {
        headers: getAuthHeader(),
        method: "POST",
        body: form
      }
    );
    const json = await result.json();
    return json.id;
  } catch (e) {
    console.error(e);
    throw new Error(e);
  }
};

export const doSimpleResumableUpload = async (file: File) => {};

export const doResumableChunkedUpload = async (
  file: File,
  progressCallback: ProgressCallback
) => {
  try {
    const fileContent = await readFile(file);
    const body = JSON.stringify({
      name: file.name,
      mimeType: file.type
    });
    const response = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable",
      {
        method: "POST",
        headers: {
          ...getAuthHeader(),
          "Content-Type": "application/json"
        },
        body
      }
    );
    if (response.status === 200) {
      const location = response.headers.get("location") as string;
      const chunkSize = 5 * 1024 * 1024;
      const buffer = new Uint8Array(fileContent);
      let flag = true;
      let startByte = 0;
      while (flag) {
        const chunk = getChunk(startByte, buffer, chunkSize);
        progressCallback(
          Math.ceil((startByte / buffer.length) * 100),
          Math.ceil(((startByte + chunk.value.length) / buffer.length) * 100)
        );
        const response = await fetch(location, {
          method: "PUT",
          headers: {
            "Content-Length": chunk.contentLength,
            "Content-Range": chunk.contentRange,
            "Content-Type": file.type
          },
          body: chunk.value
        });
        switch (response.status) {
          case 200:
            flag = false;
            progressCallback(100, 100);
            return {
              complete: true,
              response: await response.json()
            };
          case 308:
            const range = response.headers.get("range") as string;
            startByte = Number.parseInt(range.slice(6).split("-")[1]) + 1;
            break;
          default:
            console.log(response.status);
            throw new Error();
        }
      }
    }
    return {
      complete: true,
      response: await response.json()
    };
  } catch (e) {
    console.log(e);
    return {
      complete: true,
      response: undefined
    };
  }
};

const getChunk = (startByte: number, buffer: Uint8Array, chunkSize: number) => {
  const endByte =
    startByte + chunkSize > buffer.length
      ? buffer.length
      : startByte + chunkSize;
  const chunk = buffer.slice(startByte, endByte);
  return {
    value: chunk,
    contentLength: chunk.length.toString(),
    contentRange: `bytes ${startByte}-${endByte - 1}/${buffer.length}`
  };
};

const readFile = (file: File): Promise<ArrayBuffer> => {
  const reader = new FileReader();
  return new Promise((resolve, reject) => {
    reader.onabort = reader.onerror = e => reject(e);
    reader.onload = event =>
      reader.result ? resolve(reader.result as ArrayBuffer) : reject(event);
    reader.readAsArrayBuffer(file);
  });
};
