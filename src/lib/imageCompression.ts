/**
 * Comprime una imagen hasta alcanzar un tamaño máximo en KB
 * @param file - Archivo de imagen original
 * @param maxSizeKB - Tamaño máximo en KB (default: 250)
 * @returns Promise con el archivo comprimido
 */
export async function compressImage(
  file: File,
  maxSizeKB: number = 250
): Promise<File> {
  const targetBytes = maxSizeKB * 1024;
  
  // Si ya es menor al tamaño objetivo, devolver original
  if (file.size <= targetBytes) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      const img = new Image();
      
      img.onload = async () => {
        try {
          let quality = 0.9;
          let width = img.width;
          let height = img.height;
          let scaleFactor = 1.0;
          let attempts = 0;
          const maxAttempts = 10;
          
          // Función auxiliar para comprimir con parámetros específicos
          const tryCompress = async (w: number, h: number, q: number): Promise<Blob | null> => {
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            
            const ctx = canvas.getContext('2d');
            if (!ctx) return null;
            
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, w, h);
            
            return new Promise((resolveBlob) => {
              canvas.toBlob(
                (blob) => resolveBlob(blob),
                file.type || 'image/jpeg',
                q
              );
            });
          };
          
          let resultBlob: Blob | null = null;
          
          // Estrategia: primero intentar reducir calidad, luego dimensiones
          while (attempts < maxAttempts) {
            const currentWidth = Math.round(width * scaleFactor);
            const currentHeight = Math.round(height * scaleFactor);
            
            resultBlob = await tryCompress(currentWidth, currentHeight, quality);
            
            if (!resultBlob) {
              reject(new Error('Error al comprimir la imagen'));
              return;
            }
            
            // Si alcanzamos el tamaño objetivo, terminamos
            if (resultBlob.size <= targetBytes) {
              break;
            }
            
            // Calcular cuánto necesitamos reducir
            const ratio = targetBytes / resultBlob.size;
            
            // Primero reducir calidad si está por encima de 0.5
            if (quality > 0.5) {
              quality = Math.max(0.5, quality * 0.85);
            } else {
              // Si la calidad ya es baja, reducir dimensiones
              scaleFactor = Math.sqrt(ratio) * 0.9; // Factor de seguridad
              scaleFactor = Math.max(0.3, scaleFactor); // No reducir más del 70%
            }
            
            attempts++;
          }
          
          if (!resultBlob) {
            reject(new Error('No se pudo comprimir la imagen al tamaño objetivo'));
            return;
          }
          
          // Crear nuevo archivo con el blob comprimido
          const compressedFile = new File(
            [resultBlob],
            file.name,
            {
              type: file.type || 'image/jpeg',
              lastModified: Date.now()
            }
          );
          
          resolve(compressedFile);
        } catch (error) {
          reject(error);
        }
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
