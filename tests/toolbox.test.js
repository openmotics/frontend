import {Toolbox} from '../src/components/toolbox';

describe('the toolbox', () => {
  beforeEach(() => {
    // Not required currently, will have more in the future.
  });
  it('should return time in hours', () => {
    expect(Toolbox.minutesToString(67)).toBe('01:07');
    console.log('Testing minutesToString method with parameter int 67, should return 01:07. Got: '+Toolbox.minutesToString(67))
  });

  it('should remove an element from the array', () => {
    var local_array = ['first', 'second', 'third', 'fourth']

    Toolbox.removeElement(local_array, 'first', 0)
    expect(local_array).toEqual(['second', 'third', 'fourth']);
    console.log(local_array)
  });
  
  it('should check if array contains element', () => {
    var local_array = ['first', 'second', 'third', 'fourth']

    expect(Toolbox.arrayHasElement(local_array, 'first', 0)).toBe(true);
    expect(Toolbox.arrayHasElement(local_array, 'fifth', 4)).toBe(false);
    expect(Toolbox.arrayHasElement(local_array, 'first')).toBe(true);
    expect(Toolbox.arrayHasElement(local_array, 'sixth')).toBe(false);
  });

  it('should check if array contains element', () => {
    var local_string = 'OpenMotics 2019 @~?.'

    expect(Toolbox.stringContains(local_string, 'op')).toBe(false);
    expect(Toolbox.stringContains(local_string, 'Op')).toBe(true);
    expect(Toolbox.stringContains(local_string, '@~?')).toBe(true);
    expect(Toolbox.stringContains(local_string, ' ')).toBe(true);
    expect(Toolbox.stringContains(local_string, 'OpenMotics 2019 @~?.')).toBe(true);
    expect(Toolbox.stringContains(local_string, 'OpenMotics 2019 @~?. ')).toBe(false); // Plus space
  });

  it('should convert seconds into hh:mm:ss format', () => {
    var returned_time = Toolbox.splitSeconds(84927)

    expect(returned_time.hours).toEqual(23);
    expect(returned_time.minutes).toEqual(35);
    expect(returned_time.seconds).toEqual(27);
  });

  it('should return total minutes after giving hh:mm format', () => {
    expect(Toolbox.parseTime('02:10')).toEqual(130);
    expect(Toolbox.parseTime('54:00')).toEqual(3240);  // Case showing a scenario that should fail.
    expect(Toolbox.parseTime('54:00', '01:01')).toEqual(61);

    console.log(Toolbox.parseTime('153543663:2'))  // Case showing a scenario that should fail.
  });

  it('should validate if two arrays are equal', () => {
    var local_array1 = ['first', 'second', 'third', 'fourth']
    var local_array2 = ['first', 'second', 'third', 'fourth']
    expect(Toolbox.arrayEquals(local_array1, local_array2)).toBe(true);

    var local_array2 = ['second', 'first', 'third', 'fourth']
    expect(Toolbox.arrayEquals(local_array1, local_array2)).toBe(false);

    var local_array2 = ['first', 'second', 'third', 'fourtH']  // Upper case character in array
    expect(Toolbox.arrayEquals(local_array1, local_array2)).toBe(false);
    expect(Toolbox.arrayEquals('Hello there', 'Hello there')).toBe(true);  // Does it work with strings?
  });

  
  it('should make sure an int is within a limit', () => {
    expect(Toolbox.limit(8, 0, 10)).toEqual(8);
    expect(Toolbox.limit(Math.PI, 3, 3.15)).toBe(Math.PI);
    expect(Toolbox.limit(-6, -20, 0)).toBe(-6);
    expect(Toolbox.limit(1, 1, 1)).toBe(1);
    expect(Toolbox.limit(5, 6, 8)).toBe(6);
    expect(Toolbox.limit(91, 30, 90)).toBe(90);
  });

  it('should validate email', () => {
    expect(Toolbox.validEmail('support@openmotics.com')).toBe(true);
    expect(Toolbox.validEmail('support@@openmotics.com')).toBe(false);
    expect(Toolbox.validEmail('support@.com')).toBe(false);
    expect(Toolbox.validEmail('ohmyg@d what_is#this3mail@horrible.com')).toBe(false);
    expect(Toolbox.validEmail('ihavea#inmyemailbro@horrible.com')).toBe(true);
    expect(Toolbox.validEmail('" "@horrible.com')).toBe(true);
    expect(Toolbox.validEmail(' @horrible.com')).toBe(false);
  });

  it('should validate url', () => {
    expect(Toolbox.validUrl('www.working-example.com')).toBe(true);
    expect(Toolbox.validUrl('working-example.com')).toBe(true);
    expect(Toolbox.validUrl('common-mistake,com')).toBe(false);
    expect(Toolbox.validUrl('http://someone.somewhere.com')).toBe(true);
    expect(Toolbox.validUrl('facebook')).toBe(false);
    expect(Toolbox.validUrl('lots of spaces.com')).toBe(false);
    expect(Toolbox.validUrl('http://h.a')).toBe(false);  // Not sure why it's unvalidating this url.
    expect(Toolbox.validUrl('http://h.a!')).toBe(false);
  });

  it('should combine seperated strings', () => {
    expect(Toolbox.combine('-', 'hello, there!', 'I see you looking at this test?', 'Alors, changeons de langue!')).toEqual('hello, there!-I see you looking at this test?-Alors, changeons de langue!');
    expect(Toolbox.combine('-', '', '', '')).toEqual('');
    expect(Toolbox.combine('-', '--', '--')).toEqual('-----');
  });

  it('should generate crontab', () => {
    expect(Toolbox.generateCrontab(3, '10:00', 60)).toEqual('00 10 * * 3');
    // Failing! : generateCrontab keeps returning missing data
  });

  it('should parse crontab', () => {
    expect(Toolbox.parseCrontab('00 10 * *')).toBe([3, '10:00', 60]);
    // Failing! : parseCrontab keeps returning undefined
  });
});