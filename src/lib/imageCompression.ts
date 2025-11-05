/**
 * Comprime una imagen manteniendo la calidad visual pero reduciendo el tamaño del archivo
 * @param file - Archivo de imagen original
 * @param maxWidth - Ancho máximo en píxeles (default: 1920)
 * @param maxHeight - Alto máximo en píxeles (default: 1920)
 * @param quality - Calidad de compresión 0-1 (default: 0.85)
 * @returns Promise con el archivo comprimido
 */
export async function compressImage(
  file: File,
  maxWidth: number = 1920,
  maxHeight: number = 1920,
  quality: number = 0.85
): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Calcular nuevas dimensiones manteniendo el aspect ratio
        if (width > maxWidth || height > maxHeight) {
          const aspectRatio = width / height;
          
          if (width > height) {
            width = maxWidth;
            height = Math.round(width / aspectRatio);
            
            if (height > maxHeight) {
              height = maxHeight;
              width = Math.round(height * aspectRatio);
            }
          } else {
            height = maxHeight;
            width = Math.round(height * aspectRatio);
            
            if (width > maxWidth) {
              width = maxWidth;
              height = Math.round(width / aspectRatio);
            }
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('No se pudo obtener el contexto del canvas'));
          return;
        }
        
        // Dibujar imagen con suavizado
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convertir a blob
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Error al comprimir la imagen'));
              return;
            }
            
            // Crear nuevo archivo con el blob comprimido
            const compressedFile = new File(
              [blob],
              file.name,
              {
                type: file.type || 'image/jpeg',
                lastModified: Date.now()
              }
            );
            
            resolve(compressedFile);
          },
          file.type || 'image/jpeg',
          quality
        );
      };
      
      img.onerror = () => {
        reject(new Error('Error al cargar la imagen'));
      };
      
      img.src = e.target?.result as string;
    };
    
    reader.onerror = () => {
      reject(new Error('Error al leer el archivo'));
    };
    
    reader.readAsDataURL(file);
  });
}

/**
 * Formatea el tamaño de archivo en formato legible
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
