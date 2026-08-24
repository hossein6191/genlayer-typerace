import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { StrongMark } from "@/components/layout/BrandMark";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-24 text-center">
      <StrongMark className="mb-5 size-10 text-muted-foreground" />
      <h1 className="text-3xl font-bold tracking-tight">No consensus on this route</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        The page you asked for is not part of the chain
      </p>
      <div className="mt-7 flex gap-2">
        <Link to="/">
          <Button variant="outline">Home</Button>
        </Link>
        <Link to="/play">
          <Button variant="gradient">Start typing</Button>
        </Link>
      </div>
    </div>
  );
}
