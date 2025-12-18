import React, {
  forwardRef,
  useState,
  useRef,
  useCallback,
  type InputHTMLAttributes,
  type DragEvent,
  type ChangeEvent,
} from 'react';
import { Button } from '../Button';
import { Progress } from '../Progress';
import { Text } from '../Text';
import { Stack } from '../Stack';
import {
  fileUploadContainer,
  fileUploadInput,
  fileUploadContent,
  fileUploadIcon,
  fileUploadText,
  fileUploadHint,
  fileUploadProgress,
  fileList,
  fileItem,
  fileName,
  fileSize,
  fileStatus,
  fileStatusSuccess,
  fileStatusError,
  fileStatusUploading,
} from './FileUpload.css';

export interface FileUploadFile {
  file: File;
  id: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress?: number;
  error?: string;
}

export interface FileUploadProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  /** Called when files are selected or dropped */
  onFilesChange?: (files: File[]) => void;
  /** Called when upload should start for a file */
  onUpload?: (file: File) => Promise<void>;
  /** Maximum number of files allowed */
  maxFiles?: number;
  /** Maximum file size in bytes */
  maxSize?: number;
  /** Allowed file types (MIME types or extensions) */
  accept?: string;
  /** Whether drag and drop is enabled */
  enableDragDrop?: boolean;
  /** Custom upload button text */
  buttonText?: string;
  /** Custom drag text */
  dragText?: string;
  /** Custom hint text */
  hintText?: string;
  /** Whether to show file list */
  showFileList?: boolean;
  /** Current upload state */
  uploading?: boolean;
  /** Upload progress (0-100) */
  progress?: number;
  /** Error message */
  error?: string;
  /** Files with their upload status */
  files?: FileUploadFile[];
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const validateFile = (
  file: File,
  accept?: string,
  maxSize?: number
): string | null => {
  if (maxSize && file.size > maxSize) {
    return `File size must be less than ${formatFileSize(maxSize)}`;
  }

  if (accept) {
    const acceptedTypes = accept.split(',').map((type) => type.trim());
    const isAccepted = acceptedTypes.some((type) => {
      if (type.startsWith('.')) {
        return file.name.toLowerCase().endsWith(type.toLowerCase());
      }
      return file.type.match(new RegExp(type.replace('*', '.*')));
    });

    if (!isAccepted) {
      return `File type not accepted. Allowed types: ${accept}`;
    }
  }

  return null;
};

const UploadIcon: React.FC = () => (
  <svg
    className={fileUploadIcon}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
    />
  </svg>
);

export const FileUpload = forwardRef<HTMLInputElement, FileUploadProps>(
  (
    {
      onFilesChange,
      onUpload: _onUpload,
      maxFiles = 10,
      maxSize,
      accept,
      enableDragDrop = true,
      buttonText = 'Choose files',
      dragText = 'Drag and drop files here',
      hintText,
      showFileList = true,
      uploading = false,
      progress,
      error,
      files = [],
      disabled,
      className,
      ...props
    },
    ref
  ) => {
    const [isDragOver, setIsDragOver] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = useCallback(
      (selectedFiles: FileList | null) => {
        if (!selectedFiles || disabled) return;

        const validFiles: File[] = [];
        const errors: string[] = [];

        Array.from(selectedFiles).forEach((file) => {
          const error = validateFile(file, accept, maxSize);
          if (error) {
            errors.push(`${file.name}: ${error}`);
          } else if (validFiles.length < maxFiles) {
            validFiles.push(file);
          } else {
            // This valid file would exceed the limit
            errors.push(`Maximum ${maxFiles} files allowed`);
          }
        });

        if (errors.length > 0) {
          // You might want to call an onError prop here
        }

        if (validFiles.length > 0) {
          onFilesChange?.(validFiles);
        }
      },
      [accept, maxSize, maxFiles, disabled, onFilesChange]
    );

    const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
      handleFileSelect(event.target.files);
      // Clear the input value so the same file can be selected again
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    };

    const handleDragOver = (event: DragEvent) => {
      event.preventDefault();
      if (!disabled && enableDragDrop) {
        setIsDragOver(true);
      }
    };

    const handleDragLeave = (event: DragEvent) => {
      event.preventDefault();
      // Only set drag over to false if we're actually leaving the component
      const rect = event.currentTarget.getBoundingClientRect();
      const x = event.clientX;
      const y = event.clientY;

      if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
        setIsDragOver(false);
      }
    };

    const handleDrop = (event: DragEvent) => {
      event.preventDefault();
      setIsDragOver(false);

      if (!disabled && enableDragDrop) {
        handleFileSelect(event.dataTransfer.files);
      }
    };

    const handleClick = () => {
      if (!disabled) {
        inputRef.current?.click();
      }
    };

    const getContainerState = () => {
      if (disabled) return 'disabled';
      if (error) return 'error';
      if (isDragOver) return 'dragOver';
      return 'idle';
    };

    const getStatusClass = (status: FileUploadFile['status']) => {
      switch (status) {
        case 'success':
          return fileStatusSuccess;
        case 'error':
          return fileStatusError;
        case 'uploading':
          return fileStatusUploading;
        default:
          return fileStatus;
      }
    };

    const defaultHintText = accept
      ? `Accepted formats: ${accept}${maxSize ? `. Max size: ${formatFileSize(maxSize)}` : ''}`
      : maxSize
      ? `Max size: ${formatFileSize(maxSize)}`
      : 'Select files to upload';

    return (
      <Stack gap="4">
        <div
          className={`${fileUploadContainer({ state: getContainerState() })} ${className ?? ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            ref={(node) => {
              // Set forwarded ref
              if (typeof ref === 'function') {
                ref(node);
              } else if (ref) {
                ref.current = node;
              }
              // Set local ref
              if (inputRef && inputRef.current !== node) {
                (inputRef as React.MutableRefObject<HTMLInputElement | null>).current = node;
              }
            }}
            type="file"
            className={fileUploadInput}
            onChange={handleInputChange}
            accept={accept}
            multiple={maxFiles > 1}
            disabled={disabled}
            aria-label="File input"
            {...props}
          />

          <div className={fileUploadContent}>
            <UploadIcon />

            <div>
              <Text className={fileUploadText}>
                {enableDragDrop && !disabled ? dragText : 'Select files'}
              </Text>
              <Text className={fileUploadHint}>
                {hintText || defaultHintText}
              </Text>
            </div>

            {!disabled && (
              <Button
                variant="secondary"
                size="sm"
                type="button"
                onClick={handleClick}
              >
                {buttonText}
              </Button>
            )}
          </div>
        </div>

        {uploading && progress !== undefined && (
          <div className={fileUploadProgress}>
            <Progress value={progress} max={100} />
          </div>
        )}

        {error && (
          <Text color="error" size="sm">
            {error}
          </Text>
        )}

        {showFileList && files.length > 0 && (
          <div className={fileList}>
            <Stack gap="2">
              {files.map((uploadedFile) => (
                <div key={uploadedFile.id} className={fileItem}>
                  <div>
                    <span className={fileName}>{uploadedFile.file.name}</span>
                    <span className={fileSize}>
                      ({formatFileSize(uploadedFile.file.size)})
                    </span>
                  </div>

                  <div>
                    {uploadedFile.status === 'uploading' && uploadedFile.progress !== undefined && (
                      <span className={getStatusClass(uploadedFile.status)}>
                        {uploadedFile.progress}%
                      </span>
                    )}
                    {uploadedFile.status === 'success' && (
                      <span className={getStatusClass(uploadedFile.status)}>
                        ✓ Uploaded
                      </span>
                    )}
                    {uploadedFile.status === 'error' && (
                      <span className={getStatusClass(uploadedFile.status)}>
                        ✗ {uploadedFile.error || 'Error'}
                      </span>
                    )}
                    {uploadedFile.status === 'pending' && (
                      <span className={getStatusClass(uploadedFile.status)}>
                        Pending
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </Stack>
          </div>
        )}
      </Stack>
    );
  }
);

FileUpload.displayName = 'FileUpload';
