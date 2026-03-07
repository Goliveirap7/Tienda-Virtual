export type CategoriaProducto = 
  | 'UTILES' 
  | 'HOGAR' 
  | 'TECNOLOGIA' 
  | 'DAMAS' 
  | 'NIÑOS' 
  | 'HOMBRES' 
  | 'NAVIDAD';

export interface Producto {
  id: string;
  created_at?: string;
  nombre: string;
  precio: number;
  categoria: CategoriaProducto;
  stock: number;
  image_url: string | null;
  orden_prioridad: number;
}
