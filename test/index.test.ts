import { main } from '../src';

it('the main function should return a promise that is a truthy boolean', () => {
  expect.assertions(1);
  return main().then(data => expect(data).toBeTruthy());
});
