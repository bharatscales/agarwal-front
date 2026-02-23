import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function Reports() {
  return (
    <div className="px-6 pt-2 pb-6">
      <div className="mb-6">
        <h1 className="text-lg sm:text-xl font-bold">Reports</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
          View manufacturing reports.
        </p>
      </div>
      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Stock Report</CardTitle>
            <CardDescription>View and analyze stock inventory reports.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Stock report content will be available here.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

