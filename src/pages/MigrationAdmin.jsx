// src/pages/MigrationAdmin.jsx
// Admin page for running data migrations
// Access at: /migration-admin

import React, { useState } from 'react';
import SidebarLayout from '../components/layout/SidebarLayout';
import { Database, AlertTriangle, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { migrateBedtimeRoutines, rollbackMigration } from '../utils/migrateBedtimeRoutines';

export default function MigrationAdmin() {
  const [migrationStatus, setMigrationStatus] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState(null);

  const handleMigration = async () => {
    if (!window.confirm('Are you sure you want to migrate bedtime routines? This will move data from bedtimeRoutines to routines collection.')) {
      return;
    }

    setIsRunning(true);
    setMigrationStatus('running');
    setResults(null);

    try {
      const result = await migrateBedtimeRoutines();

      if (result.success) {
        setMigrationStatus('success');
        setResults(result);
      } else {
        setMigrationStatus('error');
        setResults(result);
      }
    } catch (error) {
      setMigrationStatus('error');
      setResults({ error: error.message });
    } finally {
      setIsRunning(false);
    }
  };

  const handleRollback = async () => {
    if (!window.confirm('⚠️ WARNING: This will reverse the migration. Are you absolutely sure?')) {
      return;
    }

    setIsRunning(true);
    setMigrationStatus('running');

    try {
      const result = await rollbackMigration();

      if (result.success) {
        setMigrationStatus('success');
        setResults({ message: 'Rollback completed successfully' });
      } else {
        setMigrationStatus('error');
        setResults(result);
      }
    } catch (error) {
      setMigrationStatus('error');
      setResults({ error: error.message });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <SidebarLayout>
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Database className="text-evergreen-teal" size={32} />
            <h1 className="text-3xl font-bold text-soft-charcoal">Migration Admin</h1>
          </div>
          <p className="text-muted-sage-gray">
            Run data migrations and maintenance tasks
          </p>
        </div>

        {/* Warning Banner */}
        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-yellow-600 flex-shrink-0" size={24} />
            <div>
              <h3 className="font-semibold text-yellow-900 mb-1">Admin Access Required</h3>
              <p className="text-sm text-yellow-800">
                These operations modify database structure. Only run migrations if you understand the changes being made.
              </p>
            </div>
          </div>
        </div>

        {/* Migration Card */}
        <div className="bg-white rounded-xl shadow-sm border border-divider p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-soft-charcoal mb-2">Bedtime Routines Migration</h2>
              <p className="text-sm text-muted-sage-gray mb-4">
                Consolidates duplicate bedtime routine features by migrating data from{' '}
                <code className="px-2 py-0.5 bg-dew-sage-light rounded text-xs">bedtimeRoutines</code> collection to{' '}
                <code className="px-2 py-0.5 bg-dew-sage-light rounded text-xs">routines</code> collection with{' '}
                <code className="px-2 py-0.5 bg-dew-sage-light rounded text-xs">type='bedtime'</code>
              </p>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <h4 className="font-semibold text-blue-900 text-sm mb-2">What this migration does:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>✓ Moves bedtime routines to unified routines collection</li>
                  <li>✓ Preserves all activity data and settings</li>
                  <li>✓ Skips users who already have bedtime routines in new location</li>
                  <li>✓ Deletes old bedtimeRoutines documents after successful migration</li>
                  <li>✓ Provides detailed console logs for tracking</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleMigration}
              disabled={isRunning}
              className="flex items-center gap-2 px-6 py-3 bg-evergreen-teal text-white rounded-lg hover:opacity-90 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRunning ? (
                <>
                  <RefreshCw className="animate-spin" size={20} />
                  Running...
                </>
              ) : (
                <>
                  <Database size={20} />
                  Run Migration
                </>
              )}
            </button>

            <button
              onClick={handleRollback}
              disabled={isRunning}
              className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw size={20} />
              Rollback
            </button>
          </div>
        </div>

        {/* Results Display */}
        {migrationStatus && (
          <div className={`rounded-xl shadow-sm border p-6 ${
            migrationStatus === 'success'
              ? 'bg-teal-light border-silver-sage'
              : migrationStatus === 'error'
              ? 'bg-red-50 border-red-200'
              : 'bg-blue-50 border-blue-200'
          }`}>
            <div className="flex items-start gap-3">
              {migrationStatus === 'success' && (
                <CheckCircle className="text-evergreen-teal flex-shrink-0" size={24} />
              )}
              {migrationStatus === 'error' && (
                <XCircle className="text-red-600 flex-shrink-0" size={24} />
              )}
              {migrationStatus === 'running' && (
                <RefreshCw className="text-blue-600 flex-shrink-0 animate-spin" size={24} />
              )}

              <div className="flex-1">
                <h3 className={`font-semibold mb-2 ${
                  migrationStatus === 'success'
                    ? 'text-soft-charcoal'
                    : migrationStatus === 'error'
                    ? 'text-red-900'
                    : 'text-blue-900'
                }`}>
                  {migrationStatus === 'success' && 'Migration Completed'}
                  {migrationStatus === 'error' && 'Migration Failed'}
                  {migrationStatus === 'running' && 'Migration Running...'}
                </h3>

                {results && (
                  <div className="space-y-2">
                    {results.migratedCount !== undefined && (
                      <div className="text-sm">
                        <span className="font-medium">Migrated:</span> {results.migratedCount}
                      </div>
                    )}
                    {results.skippedCount !== undefined && (
                      <div className="text-sm">
                        <span className="font-medium">Skipped:</span> {results.skippedCount}
                      </div>
                    )}
                    {results.errorCount !== undefined && (
                      <div className="text-sm">
                        <span className="font-medium">Errors:</span> {results.errorCount}
                      </div>
                    )}
                    {results.error && (
                      <div className="text-sm text-red-800">
                        <span className="font-medium">Error:</span> {results.error}
                      </div>
                    )}
                    {results.message && (
                      <div className="text-sm">
                        {results.message}
                      </div>
                    )}
                  </div>
                )}

                <p className="text-sm mt-2 opacity-80">
                  Check the browser console for detailed logs
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-dew-sage-light rounded-lg p-6 border border-divider">
          <h3 className="font-semibold text-soft-charcoal mb-3">Instructions</h3>
          <ol className="text-sm text-soft-charcoal space-y-2 list-decimal list-inside">
            <li>Open the browser console (F12) to monitor migration progress</li>
            <li>Click "Run Migration" to start the migration process</li>
            <li>Review the console logs for detailed information</li>
            <li>Check the results summary above</li>
            <li>If something goes wrong, use "Rollback" to reverse the migration</li>
            <li>After successful migration, test the app to ensure routines work correctly</li>
          </ol>
        </div>
      </div>
    </SidebarLayout>
  );
}
