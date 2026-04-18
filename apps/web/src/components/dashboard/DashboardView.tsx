import { ChartAreaInteractive } from '@/components/chart-area-interactive';
import { DataTable } from '@/components/data-table';
import { SectionCards } from '@/components/section-cards';

import dashboardTableData from '@/app/dashboard/data.json';

/**
 * Overview content for /dashboard. The surrounding sidebar chrome lives in
 * `DashboardShell` (mounted from /app/dashboard/layout.tsx) per CLAUDE.md's
 * route-only page rule.
 */
export function DashboardView() {
  return (
    <>
      <SectionCards />
      <div className="px-4 lg:px-6">
        <ChartAreaInteractive />
      </div>
      <DataTable data={dashboardTableData} />
    </>
  );
}
