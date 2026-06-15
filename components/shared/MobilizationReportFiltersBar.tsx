"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getTodayInputValue } from "@/lib/report/date-bounds";
import type {
  DailyReportFilterOptions,
  MobilizationReportFilters,
  MobilizationStatusFilter,
} from "@/lib/types";
import { CalendarDays, Filter } from "lucide-react";

const ALL_REGIONS = "__all_regions__";
const ALL_TEAMS = "__all_teams__";
const ALL_STATUSES = "__all_statuses__";

function toTeamValue(regionId: string, teamLeaderId: string) {
  return `${regionId}::${teamLeaderId}`;
}

function fromTeamValue(value: string) {
  const [regionId, teamLeaderId] = value.split("::");
  return { regionId, teamLeaderId };
}

interface MobilizationReportFiltersBarProps {
  filterOptions: DailyReportFilterOptions;
  appliedFilters: MobilizationReportFilters;
  showRegionFilter?: boolean;
  showTeamFilter?: boolean;
  isPending?: boolean;
  onApply: (filters: MobilizationReportFilters) => void;
}

export function MobilizationReportFiltersBar({
  filterOptions,
  appliedFilters,
  showRegionFilter = true,
  showTeamFilter = false,
  isPending = false,
  onApply,
}: MobilizationReportFiltersBarProps) {
  const todayKey = getTodayInputValue();
  const [dateFrom, setDateFrom] = useState(appliedFilters.dateFrom ?? todayKey);
  const [dateTo, setDateTo] = useState(appliedFilters.dateTo ?? todayKey);
  const [regionId, setRegionId] = useState(appliedFilters.regionId ?? ALL_REGIONS);
  const [statusFilter, setStatusFilter] = useState<MobilizationStatusFilter | typeof ALL_STATUSES>(
    appliedFilters.statusFilter ?? ALL_STATUSES
  );
  const [teamValue, setTeamValue] = useState(() => {
    if (appliedFilters.teamLeaderId && appliedFilters.regionId) {
      return toTeamValue(appliedFilters.regionId, appliedFilters.teamLeaderId);
    }
    return ALL_TEAMS;
  });

  const teamOptions = useMemo(() => {
    if (regionId === ALL_REGIONS) return filterOptions.teams;
    return filterOptions.teams.filter((team) => team.regionId === regionId);
  }, [filterOptions.teams, regionId]);

  function handleRegionChange(value: string) {
    setRegionId(value);
    if (value !== ALL_REGIONS && teamValue !== ALL_TEAMS) {
      const selected = fromTeamValue(teamValue);
      if (selected.regionId !== value) {
        setTeamValue(ALL_TEAMS);
      }
    }
  }

  function handleApply() {
    const selectedTeam = teamValue === ALL_TEAMS ? null : fromTeamValue(teamValue);

    onApply({
      dateFrom,
      dateTo,
      regionId: selectedTeam?.regionId ?? (regionId === ALL_REGIONS ? null : regionId),
      teamLeaderId: selectedTeam?.teamLeaderId ?? null,
      statusFilter: statusFilter === ALL_STATUSES ? "all" : statusFilter,
    });
  }

  return (
    <div className="rounded-lg border border-dswd-border bg-dswd-light/60 p-4 space-y-4 print:hidden">
      <div className="flex items-center gap-2 text-sm font-semibold text-dswd-navy">
        <Filter className="h-4 w-4" />
        Report Filters
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className="space-y-2">
          <Label htmlFor="mobilization-date-from">Date From</Label>
          <Input
            id="mobilization-date-from"
            type="date"
            value={dateFrom}
            max={dateTo}
            onChange={(event) => setDateFrom(event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="mobilization-date-to">Date To</Label>
          <Input
            id="mobilization-date-to"
            type="date"
            value={dateTo}
            min={dateFrom}
            max={todayKey}
            onChange={(event) => setDateTo(event.target.value)}
          />
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <CalendarDays className="h-3 w-3" />
            Shows personnel whose augmentation overlaps this period.
          </p>
        </div>

        <div className="space-y-2">
          <Label>Status</Label>
          <Select
            value={statusFilter}
            onValueChange={(value) =>
              setStatusFilter(value as MobilizationStatusFilter | typeof ALL_STATUSES)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_STATUSES}>All statuses</SelectItem>
              <SelectItem value="mobilized">Mobilized</SelectItem>
              <SelectItem value="demobilized">Demobilized</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {showRegionFilter && filterOptions.regions.length > 0 && (
          <div className="space-y-2">
            <Label>Region</Label>
            <Select value={regionId} onValueChange={handleRegionChange}>
              <SelectTrigger>
                <SelectValue placeholder="All regions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_REGIONS}>All regions</SelectItem>
                {filterOptions.regions.map((region) => (
                  <SelectItem key={region.id} value={region.id}>
                    {region.name} ({region.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {showTeamFilter && (
          <div className="space-y-2">
            <Label>Team</Label>
            <Select value={teamValue} onValueChange={setTeamValue}>
              <SelectTrigger>
                <SelectValue placeholder="All teams" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_TEAMS}>All teams</SelectItem>
                {teamOptions.map((team) => (
                  <SelectItem
                    key={`${team.regionId}-${team.teamLeaderId}`}
                    value={toTeamValue(team.regionId, team.teamLeaderId)}
                  >
                    {team.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex items-end">
          <Button type="button" onClick={handleApply} disabled={isPending} className="w-full md:w-auto">
            {isPending ? "Loading..." : "Apply Filters"}
          </Button>
        </div>
      </div>
    </div>
  );
}
