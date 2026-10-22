export const workdayOAuthScope = {
  workerProfileRead: "workday.worker_profile.read",
  staffingRead: "workday.staffing.read",
  recruitingRead: "workday.recruiting.read",
} as const;

export const workdayWorkerProfileReadScopes: string[] = [workdayOAuthScope.workerProfileRead];
export const workdayStaffingReadScopes: string[] = [workdayOAuthScope.staffingRead];
export const workdayRecruitingReadScopes: string[] = [workdayOAuthScope.recruitingRead];
export const workdayOAuthScopes: string[] = [
  workdayOAuthScope.workerProfileRead,
  workdayOAuthScope.staffingRead,
  workdayOAuthScope.recruitingRead,
];

export const workdayProviderPermissions = {
  workerProfile: "Worker Profile",
  staffing: "Staffing",
  recruiting: "Recruiting",
} as const;
