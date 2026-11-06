import { hashCss } from './hash-css';

describe('hashCss', () => {
  it('changes with the CSS and only with it', () => {
    expect(hashCss('a { color: red; }')).toBe(hashCss('a { color: red; }'));
    expect(hashCss('a { color: red; }')).not.toBe(
      hashCss('a { color: blue; }')
    );
  });

  it('ignores whitespace around the CSS', () => {
    expect(hashCss('\na { color: red; }\n')).toBe(hashCss('a { color: red; }'));
  });
});
