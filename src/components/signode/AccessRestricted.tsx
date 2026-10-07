import { ShieldAlert } from "lucide-react";
import { usePersona } from "@/lib/persona-context";
import { Card, CardContent } from "@/components/ui/card";

type Props = {
  attemptedPath: string;
};

export function AccessRestricted({ attemptedPath }: Props) {
  const { persona } = usePersona();

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <Card className="border-[hsl(var(--signode-orange))]/40">
        <CardContent className="p-8 text-center space-y-4">
          <div className="mx-auto h-16 w-16 rounded-full bg-[hsl(var(--signode-orange))]/10 flex items-center justify-center">
            <ShieldAlert className="h-8 w-8 text-[hsl(var(--signode-orange))]" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[hsl(var(--signode-black))]">
              Access restricted
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Your current persona{" "}
              <strong className="text-foreground">{persona.displayName}</strong>{" "}
              does not have access to this location.
            </p>
          </div>
          <div className="rounded-md bg-muted/50 border p-3 text-left">
            <div className="text-xs text-muted-foreground">
              Attempted path
            </div>
            <div className="font-mono text-sm break-all">{attemptedPath}</div>
          </div>
          <div className="text-xs text-muted-foreground pt-2 border-t">
            Need access? Contact your internal Signode Support Contact.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}