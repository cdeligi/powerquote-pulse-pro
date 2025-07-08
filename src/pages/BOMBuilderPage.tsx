
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const BOMBuilderPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to main dashboard since BOM Builder is now integrated
    navigate('/');
  }, [navigate]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-white">Redirecting to dashboard...</div>
    </div>
  );
};

export default BOMBuilderPage;
