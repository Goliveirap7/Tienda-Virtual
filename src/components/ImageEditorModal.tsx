'use client'

import { useState, useCallback, useEffect } from 'react'
import Cropper from 'react-easy-crop'
import { RotateCw, FlipHorizontal, FlipVertical, Check, X, RefreshCw } from 'lucide-react'

// Utilidad para limpiar parámetros de Cloudinary de una URL existente
// para poder mostrar la imagen original al usuario
const getCleanCloudinaryUrl = (url: string) => {
  if (!url) return url;
  const parts = url.split('/upload/');
  if (parts.length !== 2) return url;

  const pathParts = parts[1].split('/');
  const versionIndex = pathParts.findIndex(p => p.match(/^v\d+$/));

  let cleanPath = parts[1];
  if (versionIndex !== -1) {
    cleanPath = pathParts.slice(versionIndex).join('/');
  } else {
    cleanPath = pathParts[pathParts.length - 1]; // fallback al último segmento
  }

  return `${parts[0]}/upload/${cleanPath}`;
}

interface ImageEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (newUrl: string) => void;
  originalUrl: string;
  productName: string;
}

export default function ImageEditorModal({ isOpen, onClose, onSave, originalUrl, productName }: ImageEditorModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [flipH, setFlipH] = useState(false)
  const [flipV, setFlipV] = useState(false)
  const [croppedAreaPercent, setCroppedAreaPercent] = useState<any>(null)

  const cleanOriginalUrl = getCleanCloudinaryUrl(originalUrl)

  useEffect(() => {
    if (isOpen) {
      setCrop({ x: 0, y: 0 })
      setZoom(1)
      setRotation(0)
      setFlipH(false)
      setFlipV(false)
      setCroppedAreaPercent(null)
    }
  }, [isOpen, originalUrl])

  const onCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPercent(_croppedArea)
  }, [])

  // Calcula la nueva URL inyectando los parámetros de Cloudinary finales
  const buildFinalUrl = () => {
    if (!originalUrl) return originalUrl;

    const parts = originalUrl.split('/upload/');
    if (parts.length !== 2) return originalUrl;

    const stages: string[] = [];

    // Stage 1: Recorte según el porcentaje de área que calculó react-easy-crop
    if (croppedAreaPercent) {
      // react-easy-crop da x, y, width, height en % de 0 a 100
      // Cloudinary c_crop acepta factores relativos de 0.0 a 1.0
      const w = (croppedAreaPercent.width / 100).toFixed(4);
      const h = (croppedAreaPercent.height / 100).toFixed(4);
      const x = (croppedAreaPercent.x / 100).toFixed(4);
      const y = (croppedAreaPercent.y / 100).toFixed(4);

      stages.push(`c_crop,w_${w},h_${h},x_${x},y_${y}`);
    }

    // Stage 2: Ángulos y giros (esto aplica DESPUÉS del recorte en Cloudinary)
    const angleStage: string[] = [];
    if (rotation !== 0) angleStage.push(`a_${rotation}`);
    if (flipH) angleStage.push('a_hflip');
    if (flipV) angleStage.push('a_vflip');

    if (angleStage.length > 0) {
      stages.push(angleStage.join(','));
    }

    // Unimos los limpiados
    const cleanPath = getCleanCloudinaryUrl(originalUrl).split('/upload/')[1];

    const transformStr = stages.length > 0 ? stages.join('/') + '/' : '';
    return `${parts[0]}/upload/${transformStr}${cleanPath}`;
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500/75" onClick={onClose} />

        <div
          className="inline-block w-full max-w-4xl px-4 pt-5 pb-4 overflow-hidden text-left align-bottom transition-all transform bg-white rounded-lg shadow-xl sm:my-8 sm:align-middle sm:p-6 text-black relative z-10"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-5 pb-3 border-b border-gray-100">
            <div>
              <h3 className="text-xl font-bold text-gray-900 leading-tight">Editor Visual</h3>
              <p className="text-sm font-medium text-gray-500">{productName}</p>
            </div>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-6">

            {/* Lienzo Visual (CANVAS) */}
            <div className="w-full sm:w-2/3 bg-gray-100 rounded-lg flex flex-col min-h-[400px] border border-gray-300 shadow-inner overflow-hidden">
              <div className="relative w-full flex-1">
                <Cropper
                  image={cleanOriginalUrl}
                  crop={crop}
                  zoom={zoom}
                  rotation={rotation}
                  // Asumimos cuadro para consistencia con la tienda, o puedes quitar aspect
                  aspect={1}
                  onCropChange={setCrop}
                  onRotationChange={setRotation}
                  onCropComplete={onCropComplete}
                  onZoomChange={setZoom}
                  style={{
                    containerStyle: { background: '#f3f4f6' },
                    mediaStyle: { transform: `${flipH ? 'scaleX(-1)' : ''} ${flipV ? 'scaleY(-1)' : ''} rotate(${rotation}deg)` }
                  }}
                />
              </div>
              <div className="p-3 bg-white border-t border-gray-300 flex items-center gap-4">
                <span className="text-xs font-semibold text-gray-500">Zoom Fluido:</span>
                <input
                  type="range"
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.05}
                  aria-labelledby="Zoom"
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full accent-black cursor-pointer"
                />
              </div>
            </div>

            {/* Controles Laterales */}
            <div className="w-full sm:w-1/3 flex flex-col gap-4">
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                <p className="text-sm font-semibold text-gray-700 mb-3 block text-center sm:text-left">Instrucciones</p>
                <ul className="text-xs text-gray-600 list-disc pl-4 space-y-2 mb-4">
                  <li><strong>Arrastra</strong> la imagen para encuadrarla.</li>
                  <li>Usa la <strong>ruedita del mouse</strong> para hacer zoom dentro del cuadro.</li>
                  <li>Las rotaciones se aplican visualmente.</li>
                </ul>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                <p className="text-sm font-semibold text-gray-700 mb-3">Rotación Básica</p>
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setRotation(r => (r + 90) % 360); }}
                  className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
                >
                  <RotateCw className="w-4 h-4 mr-2 text-blue-500" />
                  Girar 90°
                </button>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                <p className="text-sm font-semibold text-gray-700 mb-3">Espejo (Opcional)</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setFlipH(!flipH); }}
                    className={`flex-1 flex items-center justify-center px-2 py-2 border shadow-sm text-sm font-medium rounded-md focus:outline-none transition-colors ${flipH ? 'bg-blue-50 border-blue-200 text-blue-700' : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'}`}
                  >
                    <FlipHorizontal className="w-4 h-4 mr-2" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setFlipV(!flipV); }}
                    className={`flex-1 flex items-center justify-center px-2 py-2 border shadow-sm text-sm font-medium rounded-md focus:outline-none transition-colors ${flipV ? 'bg-blue-50 border-blue-200 text-blue-700' : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'}`}
                  >
                    <FlipVertical className="w-4 h-4 mr-2" />
                  </button>
                </div>
              </div>

              <div className="mt-auto pt-4 flex gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault(); e.stopPropagation();
                    setRotation(0); setFlipH(false); setFlipV(false);
                    setZoom(1); setCrop({ x: 0, y: 0 });
                  }}
                  className="flex-shrink-0 inline-flex justify-center items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
                  title="Restaurar a original"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
                  onClick={() => {
                    const finalUrl = buildFinalUrl();
                    onSave(finalUrl);
                    onClose();
                  }}
                >
                  <Check className="w-4 h-4 mr-2" />
                  Guardar Recorte
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
