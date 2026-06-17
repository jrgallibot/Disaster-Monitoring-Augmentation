"use client";

import { useEffect, useMemo, useState } from "react";
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
import type { DailyReportFilterOptions, DailyReportFilters } from "@/lib/types";
import { CalendarDays, Filter } from "lucide-react";

const ALL_REGIONS = "__all_regions__";
const ALL_TEAMS = "__all_teams__";

function toTeamValue(regionId: string, teamLeaderId: string) {
  return `${regionId}::${teamLeaderId}`;
}

function fromTeamValue(value: string) {
  const [regionId, teamLeaderId] = value.split("::");
  return { regionId, teamLeaderId };
}

interface DailyReportFiltersBarProps {
  filterOptions: DailyReportFilterOptions;
  appliedFilters: DailyReportFilters;
  showRegionFilter?: boolean;
  showTeamFilter?: boolean;
  isPending?: boolean;
  onApply: (filters: DailyReportFilters) => void;
}

export function DailyReportFiltersBar({
  filterOptions,
  appliedFilters,
  showRegionFilter = true,
  showTeamFilter = false,
  isPending = false,
  onApply,
}: DailyReportFiltersBarProps) {
  const todayKey = getTodayInputValue();
  const [dateKey, setDateKey] = useState(appliedFilters.dateKey ?? todayKey);
  const [regionId, setRegionId] = useState(appliedFilters.regionId ?? ALL_REGIONS);
  const [teamValue, setTeamValue] = useState(() => {
    if (appliedFilters.teamLeaderId && appliedFilters.regionId) {
      return toTeamValue(appliedFilters.regionId, appliedFilters.teamLeaderId);
    }
    return ALL_TEAMS;
  });

  useEffect(() => {
    if (appliedFilters.dateKey) {
      setDateKey(appliedFilters.dateKey);
    }
    setRegionId(appliedFilters.regionId ?? ALL_REGIONS);
    if (appliedFilters.teamLeaderId && appliedFilters.regionId) {
      setTeamValue(toTeamValue(appliedFilters.regionId, appliedFilters.teamLeaderId));
    } else {
      setTeamValue(ALL_TEAMS);
    }
  }, [appliedFilters.dateKey, appliedFilters.regionId, appliedFilters.teamLeaderId]);

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

  function handleUseToday() {
    setDateKey(todayKey);
  }

  function handleApply() {
    const selectedTeam = teamValue === ALL_TEAMS ? null : fromTeamValue(teamValue);

    onApply({
      dateKey,
      regionId: selectedTeam?.regionId ?? (regionId === ALL_REGIONS ? null : regionId),
      teamLeaderId: selectedTeam?.teamLeaderId ?? null,
    });
  }

  const isTodaySelected = dateKey === todayKey;

  return (
    <div className="rounded-lg border border-dswd-border bg-dswd-light/60 p-4 space-y-4 print:hidden">
      <div className="flex items-center gap-2 text-sm font-semibold text-dswd-navy">
        <Filter className="h-4 w-4" />
        Report Filters
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="space-y-2">
          <Label htmlFor="daily-report-date">Report Date</Label>
          <div className="flex gap-2">
            <Input
              id="daily-report-date"
              type="date"
              value={dateKey}
              max={todayKey}
              onChange={(event) => setDateKey(event.target.value)}
            />
            <Button
              type="button"
              variant={isTodaySelected ? "default" : "outline"}
              size="sm"
              className="shrink-0"
              onClick={handleUseToday}
            >
              <CalendarDays className="h-4 w-4" />
              Today
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {isTodaySelected
              ? "Showing live deployment and activity for today (Philippine time)."
              : "Showing deployment history, accomplishments, and attendance for the selected date."}
          </p>
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
