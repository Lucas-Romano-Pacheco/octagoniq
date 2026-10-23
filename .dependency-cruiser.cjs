/* Contrato de arquitetura do OctagonIQ (dependency-cruiser): quem pode importar quem.
   Rodar: npm run lint:arch. Uma violação quebra o CI. */
module.exports = {
  forbidden: [
    { name: 'sem-ciclos', severity: 'error', comment: 'Importação circular deixa a ordem de carga imprevisível.', from: {}, to: { circular: true } },
    { name: 'shared-e-puro', severity: 'error', comment: 'shared/ (tipos e formatação) é usado pelo servidor e pela interface: não depende de nenhum dos dois.',
      from: { path: '^shared/' }, to: { path: '^(src|server)/' } },
    { name: 'interface-nao-importa-servidor', severity: 'error', comment: 'O navegador fala com o servidor só pela API (/api), nunca importando código do servidor.',
      from: { path: '^src/' }, to: { path: '^server/' } },
    { name: 'servidor-nao-importa-interface', severity: 'error', comment: 'O servidor não pode depender de React nem de componentes.',
      from: { path: '^server/' }, to: { path: '^src/' } },
    { name: 'paginas-independentes', severity: 'error', comment: 'Uma página não importa outra: o que é compartilhado vai para components/ ou lib/.',
      from: { path: '^src/pages/([^/]+)' }, to: { path: '^src/pages/', pathNot: '^src/pages/$1' } },
    { name: 'lib-sem-interface', severity: 'error', comment: 'src/lib (dados, regras, contas) não depende de componentes nem de páginas.',
      from: { path: '^src/lib/' }, to: { path: '^src/(components|pages)/' } },
    { name: 'componentes-sem-paginas', severity: 'error', comment: 'Componentes são usados pelas páginas, não o contrário.',
      from: { path: '^src/components/' }, to: { path: '^src/pages/' } },
    { name: 'testes-fora-do-app', severity: 'error', comment: 'Código do app não importa arquivos de teste.',
      from: { pathNot: '\\.(test|spec)\\.tsx?$|^e2e/' }, to: { path: '\\.(test|spec)\\.tsx?$|^e2e/' } },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: { path: '(^|/)(node_modules|dist|\\.vercel|legacy|__fixtures__)/' },
    tsConfig: { fileName: 'tsconfig.json' },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: { exportsFields: ['exports'], conditionNames: ['import', 'require', 'node', 'default'], extensions: ['.ts', '.tsx', '.js', '.mjs'] },
  },
};
