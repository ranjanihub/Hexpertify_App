import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <h1 className="text-2xl font-bold text-gray-900">
              404 Page Not Found
            </h1>
          </div>

          <p className="mt-4 text-sm text-gray-600 mb-6">
            The page you requested was not found.
          </p>

          <a href="/client" className="inline-flex items-center justify-center px-4 py-2 bg-[#5e2be2] text-white rounded-xl font-bold text-xs hover:bg-[#4f28d9] transition-all">
            Return to Dashboard
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
