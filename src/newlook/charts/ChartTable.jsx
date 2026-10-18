import React from 'react';

/**
 * The Table view of a chart (Spec: a Chart and Table toggle on every chart card, so the same numbers are available
 * as text). Columns are { key, header, align? } and rows are plain objects whose values are already formatted.
 */
const ChartTable = ({ caption, columns, rows, footer }) => (
  <div className="nl-chart-table-wrap" tabIndex={0} role="region" aria-label={caption}>
    <table className="nl-chart-table">
      <caption className="nl-visually-hidden">{caption}</caption>
      <thead>
        <tr>
          {columns.map((column) => (
            <th key={column.key} scope="col" className={column.align === 'right' ? 'is-right' : undefined}>
              {column.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={row.key !== undefined ? row.key : i}>
            {columns.map((column) => (
              <td key={column.key} className={column.align === 'right' ? 'is-right' : undefined}>
                {row[column.key]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
      {footer ? (
        <tfoot>
          <tr>
            {columns.map((column) => (
              <td key={column.key} className={column.align === 'right' ? 'is-right' : undefined}>
                {footer[column.key]}
              </td>
            ))}
          </tr>
        </tfoot>
      ) : null}
    </table>
  </div>
);

export default ChartTable;
