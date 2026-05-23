import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import './ImageUploader.css';

export default function ImageUploader({ value, onChange }) {
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      onChange(reader.result);
      setUploading(false);
    };
    reader.readAsDataURL(file);
  }, [onChange]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024,
  });

  const limpiar = (e) => {
    e.stopPropagation();
    onChange('');
  };

  return (
    <div className="img-uploader">
      {value ? (
        <div className="img-uploader-preview">
          <img src={value} alt="preview" />
          <button type="button" className="img-uploader-remove" onClick={limpiar}>✕</button>
        </div>
      ) : (
        <div {...getRootProps()} className={`img-uploader-zone ${isDragActive ? 'drag-active' : ''}`}>
          <input {...getInputProps()} />
          {uploading ? (
            <p>Procesando imagen...</p>
          ) : isDragActive ? (
            <p>Suelta aquí...</p>
          ) : (
            <>
              <span style={{ fontSize: '2rem' }}>🖼️</span>
              <p>Arrastra una imagen o <strong>haz clic</strong> para seleccionar</p>
              <small>JPG, PNG, WEBP — máx. 5MB</small>
            </>
          )}
        </div>
      )}
    </div>
  );
}