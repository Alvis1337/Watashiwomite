import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'react-hot-toast';

interface UsePreferencesOptions {
  username?: string;
  enabled?: boolean;
}

interface ListPreferences {
  watching: boolean;
  completed: boolean;
  on_hold: boolean;
  dropped: boolean;
  plan_to_watch: boolean;
  searchForMissingEpisodes: boolean;

  // Feature 1: Smart Duplicate Detection
  enableSmartDuplicateDetection: boolean;
  fuzzyMatchThreshold: number;

  // Feature 2: Batch Actions After Sync
  afterSyncRefreshMetadata: boolean;
  afterSyncSearchMissing: boolean;
  afterSyncBackupDatabase: boolean;

  // Feature 3: Sync Conflict Resolution
  conflictResolution: 'mal-wins' | 'sonarr-wins' | 'ask-me' | 'skip';

  // Feature 4: Sync Preview Mode
  alwaysPreviewBeforeSync: boolean;

  // Feature 5: MAL Score-Based Auto-Monitor
  scoreBasedMonitoringEnabled: boolean;
  scoreHighThreshold: number;
  scoreMedThreshold: number;

  // Feature 6: Airing Status Intelligence
  monitorOnlyCurrentSeason: boolean;
  ignoreCompletedSeries: boolean;
  prioritizeAiring: boolean;

  // Feature 7: Sync History & Rollback
  keepSyncHistory: boolean;
  maxHistoryEntries: number;

  // Feature 8: Intelligent Episode Filtering
  skipOVAs: boolean;
  skipSpecials: boolean;
  skipMovies: boolean;
  onlyMainSeries: boolean;
}

const defaultPreferences: ListPreferences = {
  watching: true,
  completed: false,
  on_hold: false,
  dropped: false,
  plan_to_watch: true,
  searchForMissingEpisodes: false,

  // Feature 1
  enableSmartDuplicateDetection: true,
  fuzzyMatchThreshold: 85,

  // Feature 2
  afterSyncRefreshMetadata: false,
  afterSyncSearchMissing: false,
  afterSyncBackupDatabase: false,

  // Feature 3
  conflictResolution: 'skip',

  // Feature 4
  alwaysPreviewBeforeSync: false,

  // Feature 5
  scoreBasedMonitoringEnabled: false,
  scoreHighThreshold: 8,
  scoreMedThreshold: 6,

  // Feature 6
  monitorOnlyCurrentSeason: false,
  ignoreCompletedSeries: false,
  prioritizeAiring: true,

  // Feature 7
  keepSyncHistory: true,
  maxHistoryEntries: 10,

  // Feature 8
  skipOVAs: false,
  skipSpecials: false,
  skipMovies: false,
  onlyMainSeries: false,
};

export function usePreferences({ username, enabled = true }: UsePreferencesOptions) {
  const [preferences, setPreferences] = useState<ListPreferences>(defaultPreferences);
  const [previousPreferences, setPreviousPreferences] =
    useState<ListPreferences>(defaultPreferences);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const loadAttemptedRef = useRef(false);

  // Load preferences
  useEffect(() => {
    if (!username || !enabled) {
      setLoading(false);
      setLoaded(true);
      return;
    }

    if (loadAttemptedRef.current) return;
    loadAttemptedRef.current = true;

    const loadPreferences = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/preferences?username=${username}`);
        const data = await response.json();

        if (data.success && data.preferences) {
          setPreferences(data.preferences);
          setPreviousPreferences(data.preferences);
        }
      } catch (error) {
        console.error('Failed to load preferences:', error);
      } finally {
        setLoading(false);
        setLoaded(true);
      }
    };

    loadPreferences();

    return () => {
      loadAttemptedRef.current = false;
    };
  }, [username, enabled]);

  // Save preferences with debounce and toast feedback
  const savePreferences = useCallback(
    (newPreferences: ListPreferences) => {
      if (!username) return;

      // Clear existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Set saving state immediately
      setSaving(true);

      // Debounce save for 1 second
      saveTimeoutRef.current = setTimeout(async () => {
        const toastId = toast.loading('Saving preferences...');
        try {
          const response = await fetch('/api/preferences', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              username,
              preferences: newPreferences,
            }),
          });

          if (!response.ok) {
            throw new Error('Failed to save preferences');
          }

          const data = await response.json();

          if (data.success) {
            toast.success('Preferences saved!', { id: toastId });
          } else {
            throw new Error(data.message || 'Failed to save preferences');
          }
        } catch (error) {
          console.error('Failed to save preferences:', error);
          toast.error('Failed to save preferences. Please try again.', { id: toastId });
        } finally {
          setSaving(false);
        }
      }, 1000);
    },
    [username]
  );

  // Update preferences
  const updatePreferences = useCallback(
    (newPreferences: Partial<ListPreferences>) => {
      setPreferences(prev => {
        const updated = { ...prev, ...newPreferences };
        savePreferences(updated);
        return updated;
      });
    },
    [savePreferences]
  );

  // Update previous (for tracking changes)
  const commitChanges = useCallback(() => {
    setPreviousPreferences(preferences);
  }, [preferences]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    preferences,
    previousPreferences,
    loading,
    loaded,
    saving,
    updatePreferences,
    commitChanges,
  };
}
