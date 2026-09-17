import { extension as getExtensionFromMimeType, extension as getMimeTypeFromExtension } from 'mime-types';
import type { MaybeRef, Ref } from 'vue';
import * as _ from 'es-toolkit/compat';
import { get } from '@vueuse/core';

export {
  getMimeTypeFromBase64,
  getMimeTypeFromExtension,
  getExtensionFromMimeType,
  useDownloadFileFromBase64,
  useDownloadFileFromBase64Refs,
  previewImageFromBase64,
};

const commonMimeTypesSignatures = {
  JVBERi0: 'application/pdf',
  R0lGODdh: 'image/gif',
  R0lGODlh: 'image/gif',
  iVBORw0KGgo: 'image/png',
  '/9j/': 'image/jpeg',
  UklGR: 'image/webp',
};

function normalizeBase64String(base64String: string) {
  const trimmed = base64String.trim();
  const dataUrlMatch = trimmed.match(/^data:.*?;base64,(.*)$/is);
  const payload = dataUrlMatch ? dataUrlMatch[1] : trimmed;
  return payload.replace(/\s/g, '');
}

function getMimeTypeFromBase64({ base64String }: { base64String: string }) {
  const normalized = base64String.trim();
  const [, mimeTypeFromBase64] = normalized.match(/^data:(.*?);base64,/i) ?? [];

  if (mimeTypeFromBase64) {
    return { mimeType: mimeTypeFromBase64 };
  }

  const cleanBase64 = normalizeBase64String(base64String);
  const inferredMimeType = _.find(commonMimeTypesSignatures, (_mimeType, signature) =>
    cleanBase64.startsWith(signature),
  );

  if (inferredMimeType) {
    return { mimeType: inferredMimeType };
  }

  return { mimeType: undefined };
}

function getFileExtensionFromMimeType({
  mimeType,
  defaultExtension = 'txt',
}: {
  mimeType: string | undefined;
  defaultExtension?: string;
}) {
  if (mimeType) {
    return getExtensionFromMimeType(mimeType) ?? defaultExtension;
  }

  return defaultExtension;
}

function toDataUrl(base64String: string, mimeType?: string) {
  const trimmed = base64String.trim();
  if (/^data:.*?;base64,/i.test(trimmed)) {
    const [header, payload = ''] = trimmed.split(',', 2);
    return `${header},${payload.replace(/\s/g, '')}`;
  }

  const cleanBase64 = normalizeBase64String(trimmed);
  if (!mimeType) {
    throw new Error('Unable to infer MIME type from Base64 string');
  }

  return `data:${mimeType};base64,${cleanBase64}`;
}

function downloadFromBase64({
  sourceValue,
  filename,
  extension,
  fileMimeType,
}: {
  sourceValue: string;
  filename?: string;
  extension?: string;
  fileMimeType?: string;
}) {
  if (sourceValue.trim() === '') {
    throw new Error('Base64 string is empty');
  }

  const { mimeType } = getMimeTypeFromBase64({ base64String: sourceValue });
  const defaultExtension = extension ?? getFileExtensionFromMimeType({ mimeType });
  const targetMimeType = mimeType ?? fileMimeType ?? getMimeTypeFromExtension(defaultExtension);
  const base64String = toDataUrl(sourceValue, targetMimeType);

  const cleanExtension = extension ?? getFileExtensionFromMimeType({
    mimeType: targetMimeType,
    defaultExtension,
  });
  let cleanFileName = filename ?? `file.${cleanExtension}`;
  if (extension && !cleanFileName.toLowerCase().endsWith(`.${extension.toLowerCase()}`)) {
    cleanFileName = `${cleanFileName}.${cleanExtension}`;
  }

  const a = document.createElement('a');
  a.href = base64String;
  a.download = cleanFileName;
  a.click();
}

function useDownloadFileFromBase64({
  source,
  filename,
  extension,
}: {
  source: MaybeRef<string>;
  filename?: MaybeRef<string>;
  extension?: MaybeRef<string>;
}) {
  return {
    download() {
      downloadFromBase64({ sourceValue: get(source), filename: get(filename), extension: get(extension) });
    },
  };
}

function previewImageFromBase64(base64String: string): HTMLImageElement {
  if (base64String.trim() === '') {
    throw new Error('Base64 string is empty');
  }

  const { mimeType } = getMimeTypeFromBase64({ base64String });
  if (!mimeType?.startsWith('image/')) {
    throw new Error('Base64 string does not contain a supported image MIME type');
  }

  const dataUriBase64String = toDataUrl(base64String, mimeType);
  const img = document.createElement('img');
  img.src = dataUriBase64String;

  const container = document.createElement('div');
  container.appendChild(img);

  const previewContainer = document.getElementById('previewContainer');
  if (previewContainer) {
    previewContainer.innerHTML = '';
    previewContainer.appendChild(container);
  } else {
    throw new Error('Preview container element not found');
  }

  return img;
}

function useDownloadFileFromBase64Refs({
  source,
  filename,
  extension,
}: {
  source: Ref<string>;
  filename?: Ref<string>;
  extension?: Ref<string>;
}) {
  return {
    download() {
      downloadFromBase64({ sourceValue: source.value, filename: filename?.value, extension: extension?.value });
    },
  };
}
