import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
  container: { padding: '1rem' },
});

export default function MyComponent() {
  return <div {...stylex.props(styles.container)}>Hello</div>;
}