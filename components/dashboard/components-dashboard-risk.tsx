'use client';
import { IRootState } from '@/store';
import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';

interface MatrixRisk {
  risk_id: number;
  color?: string;
  risk_color?: string;
  color_code?: string;
  hex_color?: string;
  description?: string;
  [key: string]: any;
}

interface MatrixCell {
  row: number;
  col: number;
  risk_id: number;
  count_asset: number;
  color?: string;
  [key: string]: any;
}

interface RiskMatrixProps {
  rbimId: number;
  title: string;
}

const RiskMatrix: React.FC<RiskMatrixProps> = ({ rbimId, title }) => {
  const [matrixRisk, setMatrixRisk] = useState<MatrixRisk[]>([]);
  const [matrixCells, setMatrixCells] = useState<MatrixCell[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isDark = useSelector((state: IRootState) => state.themeConfig.theme === 'dark' || state.themeConfig.isDarkMode);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/risk-analysis/model-risk?rbim_id=${rbimId}`);
        const result = await response.json();
        
        if (result.success) {
          console.log(`API Response for rbimId=${rbimId}:`, {
            matrixRisk: result.data.matrixRisk,
            matrixCells: result.data.matrixCells,
            matrixRiskCount: result.data.matrixRisk?.length,
            matrixCellsCount: result.data.matrixCells?.length,
            sampleCell: result.data.matrixCells?.[0]
          });
          setMatrixRisk(result.data.matrixRisk || []);
          setMatrixCells(result.data.matrixCells || []);
        } else {
          setError(result.error || 'Failed to fetch data');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [rbimId]);

  // Create a map of risk_id to color
  const riskColorMap: Record<number, string> = {};
  matrixRisk.forEach(risk => {
    // Try to find color field - could be 'color', 'risk_color', 'color_code', etc.
    let colorField = risk.color || risk.risk_color || risk.color_code || risk.hex_color || '#cccccc';
    // Ensure color has # prefix if it's a hex code without it
    if (colorField && !colorField.startsWith('#') && /^[0-9A-Fa-f]{6}$/.test(colorField)) {
      colorField = '#' + colorField;
    }
    riskColorMap[risk.risk_id] = colorField;
  });
  
  // Debug logging - show exact field names and values
  if (matrixRisk.length > 0) {
    const sampleRisk = matrixRisk[0];
    const fieldDetails: Record<string, any> = {};
    Object.keys(sampleRisk).forEach(key => {
      fieldDetails[key] = sampleRisk[key];
    });
    
    console.log(`=== DEBUG for rbimId=${rbimId} ===`);
    console.log(`Risk count: ${matrixRisk.length}`);
    console.log(`Sample risk fields:`, fieldDetails);
    console.log(`All field names:`, Object.keys(sampleRisk));
    console.log(`Computed color map:`, riskColorMap);
    console.log(`Sample risk color detection:`, {
      'risk.color': sampleRisk.color,
      'risk.risk_color': sampleRisk.risk_color,
      'risk.color_code': sampleRisk.color_code,
      'risk.hex_color': sampleRisk.hex_color,
      'finalColor': riskColorMap[sampleRisk.risk_id],
      'finalColorWithHash': riskColorMap[sampleRisk.risk_id]
    });
    console.log(`=== END DEBUG ===`);
  }

  // Determine matrix dimensions
  const maxRow = matrixCells.length > 0 ? Math.max(...matrixCells.map(cell => cell.row)) : 0;
  const maxCol = matrixCells.length > 0 ? Math.max(...matrixCells.map(cell => cell.col)) : 0;
  
  // Debug logging for cells
  if (matrixCells.length > 0) {
    console.log(`=== CELL DEBUG for rbimId=${rbimId} ===`);
    console.log(`Cell count: ${matrixCells.length}`);
    console.log(`Matrix dimensions: ${maxRow} rows x ${maxCol} cols`);
    console.log(`Sample cell:`, matrixCells[0]);
    console.log(`Unique risk_ids in cells:`, Array.from(new Set(matrixCells.map(cell => cell.risk_id))));
    console.log(`=== END CELL DEBUG ===`);
  }

  // Create matrix grid with likelihood ordered descending (highest at top)
  // debugger;
  const grid = [];
  for (let row = maxRow; row >= 1; row--) {
    const rowCells = [];
    for (let col = 1; col <= maxCol; col++) {
      const cell = matrixCells.find(c => c.row === row && c.col === col);
      const riskId = cell?.risk_id || 0;
      const count = cell?.count_asset || 0;
      const color = riskColorMap[riskId] || '#cccccc';
      
      rowCells.push({
        row,
        col,
        riskId,
        count,
        color,
        cellData: cell
      });
    }
    grid.push(rowCells);
  }

  if (loading) {
    return (
      <div className="panel h-full">
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <span className="ml-2">Loading {title}...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="panel h-full">
        <div className="flex h-64 items-center justify-center text-danger">
          Error loading {title}: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="panel h-full">
      <div className="mb-5 flex items-center justify-between">
        <h5 className="text-lg font-semibold dark:text-white-light">{title}</h5>
        <div className="rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary dark:bg-primary dark:text-white-light">
          RBIM ID: {rbimId}
        </div>
      </div>
      
      <div className="mb-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-semibold text-white-dark">Risk Matrix Visualization</div>
          <div className="text-xs text-white-dark">
            {maxRow} × {maxCol} Matrix
          </div>
        </div>
        
        {/* Risk Legend */}
        {matrixRisk.length > 0 && (
          <div className="mb-4 rounded border border-white-light p-3 dark:border-dark">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-white-dark">Risk Levels</div>
            <div className="flex flex-wrap gap-3">
              {matrixRisk.map(risk => {
                let color = risk.color || risk.risk_color || risk.color_code || risk.hex_color || '#cccccc';
                // Ensure color has # prefix if it's a hex code without it
                if (color && !color.startsWith('#') && /^[0-9A-Fa-f]{6}$/.test(color)) {
                  color = '#' + color;
                }
                return (
                  <div key={risk.risk_id} className="flex items-center rounded bg-white-light/50 px-2 py-1 dark:bg-dark">
                    <div
                      className="h-3 w-3 rounded-sm mr-2"
                      style={{ backgroundColor: color }}
                    ></div>
                    <span className="text-xs">
                      {risk.description || `Risk ${risk.risk_id}`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Matrix Grid */}
        {grid.length > 0 ? (
          <div className="overflow-x-auto rounded border border-white-light dark:border-dark">
            <div className="inline-block min-w-full">
              {/* Column Headers */}
              <div className="flex border-b border-white-light dark:border-dark">
                <div className="w-12 flex-shrink-0 bg-white-light/50 p-2 text-center text-xs font-semibold dark:bg-dark/50">
                  Likelihood →
                </div>
                {Array.from({ length: maxCol }, (_, i) => i + 1).map(col => {
                  // Convert column number to letter: 1 -> A, 2 -> B, etc.
                  const letter = String.fromCharCode(64 + col); // 65 is 'A', 64 + 1 = 65 -> 'A'
                  return (
                    <div
                      key={`header-col-${col}`}
                      className="flex-1 bg-white-light/30 p-2 text-center text-xs font-semibold dark:bg-dark/30"
                    >
                      {letter}
                    </div>
                  );
                })}
              </div>

              {/* Matrix Rows */}
              {grid.map((rowCells, rowIndex) => {
                // Get the actual likelihood value (row number from database)
                // Since grid is created in descending order, the first row in grid has the highest row number
                const actualRowNumber = rowCells[0]?.row || (maxRow - rowIndex);
                
                return (
                  <div
                    key={`row-${rowIndex}`}
                    className={`flex ${rowIndex < grid.length - 1 ? 'border-b border-white-light dark:border-dark' : ''}`}
                  >
                    {/* Row Header */}
                    <div className="w-12 flex-shrink-0 flex items-center justify-center bg-white-light/50 p-2 text-xs font-semibold dark:bg-dark/50">
                      {actualRowNumber}
                    </div>
                    
                    {/* Cells */}
                    {rowCells.map((cell, colIndex) => {
                      // Determine text color based on background brightness for better contrast
                      const hexColor = cell.color || '#cccccc';
                      const r = parseInt(hexColor.slice(1, 3), 16);
                      const g = parseInt(hexColor.slice(3, 5), 16);
                      const b = parseInt(hexColor.slice(5, 7), 16);
                      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
                      const textColor = brightness > 128 ? '#000000' : '#ffffff';
                      
                      return (
                        <div
                          key={`cell-${rowIndex}-${colIndex}`}
                          className="flex-1 aspect-square flex flex-col items-center justify-center p-1 transition-all hover:scale-105 hover:shadow-lg"
                          style={{
                            backgroundColor: cell.color || '#cccccc',
                            color: textColor,
                            borderLeft: colIndex > 0 ? `1px solid ${isDark ? '#374151' : '#e5e7eb'}` : 'none'
                          }}
                          title={`Likelihood: ${cell.row}, Consequence: ${cell.col} (${String.fromCharCode(64 + cell.col)}), Risk Level: ${cell.riskId}, Assets: ${cell.count}`}
                        >
                          <div className="text-lg font-bold my-1" style={{ color: textColor }}>{cell.count === 0 ? '' : cell.count}</div>
                          {/* <div className="text-xs text-center opacity-90" style={{ color: textColor }}>asset{cell.count !== 1 ? 's' : ''}</div> */}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="rounded border border-dashed border-white-light p-8 text-center dark:border-dark">
            <div className="text-lg font-semibold text-white-dark">No matrix data available</div>
            <div className="text-sm text-white-dark mt-2">The risk matrix for this assessment method is empty</div>
          </div>
        )}

        {/* Summary */}
        {matrixCells.length > 0 && (
          <div className="mt-4 rounded border border-white-light p-3 dark:border-dark">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-white-dark">Matrix Summary</div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-primary">{matrixCells.length}</div>
                <div className="text-xs text-white-dark">Total Cells</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-success">
                  {matrixCells.reduce((sum, cell) => sum + (cell.count_asset || 0), 0)}
                </div>
                <div className="text-xs text-white-dark">Total Assets</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-warning">{matrixRisk.length}</div>
                <div className="text-xs text-white-dark">Risk Levels</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RiskMatrix;