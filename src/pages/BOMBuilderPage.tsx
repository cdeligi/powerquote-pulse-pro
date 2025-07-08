
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import BOMBuilder from "@/components/bom/BOMBuilder";

const BOMBuilderPage = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [isBuilderOpen, setIsBuilderOpen] = useState(true);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex items-center space-x-2 text-white">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading BOM Builder...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    navigate('/');
    return null;
  }

  const handleClose = () => {
    setIsBuilderOpen(false);
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-black">
      <div className="p-4">
        <Button
          onClick={() => navigate('/')}
          variant="outline"
          className="mb-4 border-gray-600 text-gray-300 hover:bg-gray-800"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>
      
      <BOMBuilder
        isOpen={isBuilderOpen}
        onClose={handleClose}
        mode="create"
      />
    </div>
  );
};

export default BOMBuilderPage;
