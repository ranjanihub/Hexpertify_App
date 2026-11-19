import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  const [, setLocation] = useLocation();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mb-6">
        <span className="text-2xl font-bold text-muted-foreground">404</span>
      </div>
      <h1 className="text-3xl font-bold mb-2">Page not found</h1>
      <p className="text-muted-foreground max-w-md mb-8">
        The page you're looking for doesn't exist or has been moved. Check the URL and try again.
      </p>
      <Button onClick={() => setLocation("/")}>
        Return to Dashboard
      </Button>
    </div>
  );
}
