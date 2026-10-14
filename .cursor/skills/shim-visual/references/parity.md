# IDE vs shim (durable)

Append a row when a Cursor screenshot disagrees with our PNG. Fix lives in the shim.

|Cursor|Shim|
|---|---|
|Line/area straight|`curveType: 'linear'` unless `smooth`|
|Legend under the plot, centered|`legendProps.verticalAlign: 'bottom'` + legend style `justifyContent: 'center'`|
|Pie rotated 180°, donut thicker, center `N` / `Total`|`startAngle` 180 / `endAngle` 540, `thickness`, `chartLabel`|
|Pie legend horizontal (`Name 75%`)|`ChartLegend` row, not a column|
|Bar values bold above (or right if horizontal), even with no suffix|always pass `valueFormatter`; `valueLabelProps.fontWeight: 700`; vertical charts need top `margin` or labels clip|
|Horizontal category labels one line + tooltip|custom Y tick + SVG `<title>`|
|Card titles near-white in dark|`CardHeader` `text.primary`; chart `textColor` = host foreground (not Mantine dimmed)|
|`TodoListCard` header gray; `TodoList` bare|header `fill.secondary` only|
|Wide SVG letterboxed (`maxHeight` + `meet`)|host CSS clears `max-height` on `svg[viewBox][width='100%']`|
