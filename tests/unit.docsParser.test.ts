import { readAllDocs } from '../src/docs/parser';

test('docs include required parameter names and auth headers', () => {
  const all = readAllDocs();
  expect(all).toContain('commodity_code_id');
  expect(all).toContain('commodity_id');
  expect(all).toContain('line_item_code');
  expect(all).toContain('line_item_id');
  expect(all).toContain('X-Api-Key');
  expect(all).toContain('X-Client-Token');
});
