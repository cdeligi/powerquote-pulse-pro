
import { Button } from "@/components/ui/button";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
}

interface ProductTableProps {
  products: Product[];
  onProductSelect: (product: Product) => void;
}

const ProductTable = ({ products, onProductSelect }: ProductTableProps) => {
  return (
    <div className="space-y-2">
      {products.map((product) => (
        <div key={product.id} className="flex items-center justify-between p-3 bg-gray-800 rounded border border-gray-700">
          <div className="flex-1">
            <h4 className="text-white font-medium">{product.name}</h4>
            <p className="text-gray-400 text-sm">{product.description}</p>
            <p className="text-green-400 font-bold">${product.price.toLocaleString()}</p>
          </div>
          <Button
            onClick={() => onProductSelect(product)}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Add to BOM
          </Button>
        </div>
      ))}
    </div>
  );
};

export default ProductTable;
