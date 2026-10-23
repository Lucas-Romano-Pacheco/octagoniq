/* Mensagens de commit no padrão Conventional Commits, com o texto em português:
   "feat: ranking com pódio", "fix(lutador): estatísticas pela ESPN quando o UFC.com falha". */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [2, 'always', ['feat', 'fix', 'perf', 'refactor', 'style', 'test', 'docs', 'build', 'ci', 'chore', 'revert']],
    'subject-case': [0],          // português: frase com inicial maiúscula ou minúscula, tanto faz
    'header-max-length': [2, 'always', 100],
    'body-max-line-length': [0],
  },
};
