
import { User as UserType } from "@/types/auth";
import EnhancedQuoteApprovalDashboard from "./EnhancedQuoteApprovalDashboard";

interface QuoteApprovalDashboardProps {
  user: UserType;
}

const QuoteApprovalDashboard = ({ user }: QuoteApprovalDashboardProps) => {
  return <EnhancedQuoteApprovalDashboard user={user} />;
};

export default QuoteApprovalDashboard;
