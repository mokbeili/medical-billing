import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BillingCode } from "@prisma/client";

interface BillingCodeWithSection extends BillingCode {
  section: {
    code: string;
    title: string;
  };
}

interface SearchResultsProps {
  results: BillingCodeWithSection[];
}

export function SearchResults({ results }: SearchResultsProps) {
  if (!results.length) {
    return (
      <div className="text-center text-muted-foreground py-8">
        No results found
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {results.map((code) => (
        <Card key={code.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                {code.code} - {code.title}
              </CardTitle>
              <Badge variant="outline">{code.section.code}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {code.description}
              </p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Fee Range:</span> $
                  {code.low_fee.toFixed(2)} - ${code.high_fee.toFixed(2)}
                </div>
                <div>
                  <span className="font-medium">Service Class:</span>{" "}
                  {code.service_class || "N/A"}
                </div>
                <div>
                  <span className="font-medium">Add-on Indicator:</span>{" "}
                  {code.add_on_indicator || "N/A"}
                </div>
                <div>
                  <span className="font-medium">Multiple Unit:</span>{" "}
                  {code.multiple_unit_indicator || "N/A"}
                </div>
                <div>
                  <span className="font-medium">Fee Determinant:</span>{" "}
                  {code.fee_determinant}
                </div>
                <div>
                  <span className="font-medium">Anaesthesia:</span>{" "}
                  {code.anaesthesia_indicator || "N/A"}
                </div>
                <div>
                  <span className="font-medium">Submit at 100%:</span>{" "}
                  {code.submit_at_100_percent || "N/A"}
                </div>
                <div>
                  <span className="font-medium">Referring Practitioner:</span>{" "}
                  {code.referring_practitioner_required || "N/A"}
                </div>
                <div>
                  <span className="font-medium">Start Time Required:</span>{" "}
                  {code.start_time_required || "N/A"}
                </div>
                <div>
                  <span className="font-medium">Stop Time Required:</span>{" "}
                  {code.stop_time_required || "N/A"}
                </div>
                <div>
                  <span className="font-medium">Technical Fee:</span>{" "}
                  {code.technical_fee
                    ? `$${code.technical_fee.toFixed(2)}`
                    : "N/A"}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
