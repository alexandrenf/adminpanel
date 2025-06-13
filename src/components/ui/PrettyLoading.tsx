import { Loader2 } from "lucide-react";
import { memo } from "react";

const PrettyLoading = memo(() => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[200px] py-8">
      <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
      <span className="text-lg text-gray-700 font-medium">Carregando...</span>
    </div>
  );
});

PrettyLoading.displayName = 'PrettyLoading';

export default PrettyLoading; 