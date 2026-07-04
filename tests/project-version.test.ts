import { describe, expect, it } from 'vitest';
import {
  VERSION_LOCKED_CODE,
  VERSION_LOCKED_MESSAGE,
  isVersionEditable,
  isVersionLocked,
  versionLockedJson
} from '../lib/project-version';

describe('project version lock helpers', () => {
  it('uses the unified lock code and message in JSON responses', async () => {
    const response = versionLockedJson();
    expect(response.status).toBe(423);
    expect(await response.json()).toEqual({
      success: false,
      error: {
        code: VERSION_LOCKED_CODE,
        message: VERSION_LOCKED_MESSAGE
      }
    });
  });

  it('treats locked, final, and explicit isLocked versions as non-editable', () => {
    expect(isVersionLocked({ status: 'locked' })).toBe(true);
    expect(isVersionLocked({ status: 'final' })).toBe(true);
    expect(isVersionEditable({ status: 'draft', isLocked: true })).toBe(false);
    expect(isVersionEditable({ status: 'draft', isLocked: false })).toBe(true);
  });
});
