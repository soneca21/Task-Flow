# Comandos Mais Usados (Commit + Push)

## Fluxo padrão (qualquer alteração)
```bash
git add -A
git commit -m "mensagem do commit"
git push
```

## Commit rápido em uma linha
```bash
git add -A && git commit -m "mensagem do commit" && git push
```

## Commit só de arquivos específicos
```bash
git add src/pages/Tarefas.jsx src/index.css
git commit -m "ajusta cards no PWA"
git push
```

## Conferência antes de subir
```bash
git status --short
git log -1 --oneline
git push
```

## Se quiser atualizar antes de subir
```bash
git pull --rebase
git push
```
