import { useQuery } from '@tanstack/react-query';
import { getLatestPipeline, getPipelineBuild } from './api.js';

// Query keys
export const qk = {
  latest: ['pipeline', 'latest'],
  build: (n) => ['pipeline', 'build', Number(n)],
  analysis: (n) => ['analysis', 'status', Number(n)],
};

// useLatestBuildQuery: fetch latest build and refetch while running
export function useLatestBuildQuery() {
  return useQuery({
    queryKey: qk.latest,
    queryFn: getLatestPipeline,
    staleTime: 10000,
    refetchOnWindowFocus: false,
    retry: false,
    refetchInterval: (data) => {
      const building = !!data?.building || data?.buildStatus === 'BUILDING';
      return building ? 7000 : false;
    },
  });
}

// useBuildDetailsQuery: fetch build details and optionally refetch while running
export function useBuildDetailsQuery(buildNumber) {
  const num = Number(buildNumber);
  return useQuery({
    queryKey: qk.build(num),
    queryFn: () => getPipelineBuild(num),
    enabled: Number.isFinite(num) && num > 0,
    staleTime: 10000,
    refetchOnWindowFocus: false,
    retry: false,
    // Poll while build/analysis is not completed, otherwise stop
    refetchInterval: (data) => {
      const building = !!data?.building || data?.buildStatus === 'BUILDING';
      const analyzing = data?.analysisStatus && data.analysisStatus !== 'COMPLETED';
      const hasFinal = data?.finalResult != null;
      // Continue polling after COMPLETED until finalResult exists
      if (building || analyzing) return 7000;
      return hasFinal ? false : 7000;
    },
  });
}

// useAnalysisStatusQuery: derive analysis status from build details
export function useAnalysisStatusQuery(buildNumber) {
  const num = Number(buildNumber);
  return useQuery({
    queryKey: qk.analysis(num),
    queryFn: async () => {
      const d = await getPipelineBuild(num);
      return { status: d?.analysisStatus || null, finalResult: d?.finalResult ?? null };
    },
    enabled: Number.isFinite(num) && num > 0,
    staleTime: 10000,
    refetchOnWindowFocus: false,
    retry: false,
    // Poll every 2s until COMPLETED, then stop
    refetchInterval: (res) => {
      const status = res?.status;
      const hasFinal = res?.finalResult != null;
      if (!status || status !== 'COMPLETED') return 7000;
      return hasFinal ? false : 7000;
    },
  });
}
