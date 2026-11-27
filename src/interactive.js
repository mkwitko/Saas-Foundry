import fs from "node:fs";
import path from "node:path";
import { createInterface } from "node:readline/promises";
import { spawnSync } from "node:child_process";
import { detectProject, resolveNewWorkspace } from "./project-detection.js";
import { runFoundry } from "./run.js";

function commandExists(command) {
  const lookup = process.platform === "win32" ? "where" : "which";
  return spawnSync(lookup, [command], { stdio: "ignore" }).status === 0;
}

export function detectAvailableAgents() {
  return ["claude", "codex", "opencode"].filter(commandExists);
}

async function choose(rl, label, options, defaultValue) {
  process.stdout.write("\n" + label + "\n");
  options.forEach((option, index) => {
    const suffix = option.value === defaultValue ? " (recomendado)" : "";
    process.stdout.write("  " + (index + 1) + ". " + option.label + suffix + "\n");
  });
  const defaultIndex = options.findIndex(option => option.value === defaultValue) + 1;
  const answer = (await rl.question("Escolha [" + defaultIndex + "]: ")).trim();
  if (!answer) return defaultValue;
  const index = Number(answer) - 1;
  if (!Number.isInteger(index) || !options[index]) {
    process.stdout.write("Opção inválida; usando a opção recomendada.\n");
    return defaultValue;
  }
  return options[index].value;
}

async function ask(rl, label, optional = true) {
  const suffix = optional ? " (opcional; Enter para pular)" : "";
  return (await rl.question(label + suffix + ": ")).trim();
}

function appendIntake(projectRoot, mode, answers) {
  const entries = Object.entries(answers).filter(([, value]) => value);
  if (!entries.length) return null;
  const directory = path.join(projectRoot, ".foundry");
  fs.mkdirSync(directory, { recursive: true });
  const file = path.join(directory, "intake.md");
  const heading = "\n\n## Intake " + new Date().toISOString() + " (" + mode + ")\n\n";
  const body = entries.map(([question, answer]) => "### " + question + "\n\n" + answer + "\n").join("\n");
  fs.appendFileSync(file, heading + body, { encoding: "utf8", mode: 0o600 });
  fs.chmodSync(file, 0o600);
  return file;
}

async function collectFounderContext(rl, mode) {
  process.stdout.write("Não informe senhas, tokens, dados de pacientes ou conversas privadas.\n");
  process.stdout.write(mode === "new"
    ? "\nVamos estruturar a oportunidade antes de decidir o que construir. Você pode pular qualquer pergunta.\n"
    : "\nVamos entender o negócio e o principal gargalo antes de propor mudanças. Você pode pular qualquer pergunta.\n");
  const answers = {};
  if (mode === "new") {
    answers["Ideia ou hipótese inicial"] = await ask(rl, "O que você imagina construir ou oferecer");
    answers["Cliente e comprador"] = await ask(rl, "Quem teria esse problema e quem pagaria");
    answers["Dor e frequência"] = await ask(rl, "Qual dor concreta essa pessoa enfrenta e com que frequência");
    answers["Alternativas atuais"] = await ask(rl, "Como ela resolve isso hoje, incluindo planilhas, pessoas ou não fazer nada");
    answers["Urgência e custo da dor"] = await ask(rl, "O que acontece se ela não resolver esse problema");
    answers["Vantagem do fundador"] = await ask(rl, "Por que você tem acesso, experiência ou vantagem nesse mercado");
    answers["Mercado e localização"] = await ask(rl, "Em que país, idioma ou mercado pretende começar");
    answers["Modelo de receita"] = await ask(rl, "Como imagina cobrar, se já tiver uma hipótese");
    answers["Restrições e objetivo"] = await ask(rl, "Tempo, orçamento, prazo ou resultado desejado");
  } else {
    answers["Produto e cliente prioritário"] = await ask(rl, "O que o produto faz e para quem");
    answers["Principal gargalo percebido"] = await ask(rl, "Qual é hoje o maior problema: aquisição, vendas, ativação, retenção, receita, produto ou engenharia");
    answers["Evidência disponível"] = await ask(rl, "Que dados, conversas ou métricas já sustentam essa percepção");
    answers["Resultado desejado"] = await ask(rl, "Qual resultado concreto você quer alcançar primeiro");
    answers["Restrições"] = await ask(rl, "Limites de tempo, orçamento, stack ou operação");
  }
  return answers;
}

const TASK_OPTIONS = [
  { value: "auto", label: "Diagnosticar o gargalo e executar o próximo passo" },
  { value: "full", label: "Revisar o ciclo completo do negócio e produto" },
  { value: "idea", label: "Validar uma ideia de SaaS" },
  { value: "product", label: "Melhorar produto, UI/UX e engenharia" },
  { value: "sales", label: "Conseguir e converter clientes" },
  { value: "growth", label: "Aquisição, ativação, retenção e crescimento" },
  { value: "review", label: "Somente diagnóstico, sem alterações" }
];

export async function runInteractive({ cwd = process.cwd() } = {}) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const detection = detectProject(cwd);
    process.stdout.write("\nSaaS Foundry — sistema operacional de produto e negócio\n");
    process.stdout.write("Pasta atual: " + detection.root + "\n");
    if (detection.existing) {
      process.stdout.write("Projeto detectado (" + detection.confidence + " confiança): " +
        (detection.signals.markers.join(", ") || (detection.signals.git_repository ? ".git" : ".foundry")) + "\n");
    } else {
      process.stdout.write("Nenhum marcador de projeto encontrado nesta pasta.\n");
    }

    let mode = await choose(rl, "Como deseja começar?", [
      { value: "existing", label: "Usar o projeto desta pasta" },
      { value: "new", label: "Criar um SaaS novo neste workspace" },
      { value: "exit", label: "Sair" }
    ], detection.recommendation);
    if (mode === "exit") return { cancelled: true };

    let projectRoot = detection.root;
    let projectName = null;
    if (mode === "new") {
      projectName = (await ask(rl, "Nome provisório do projeto", false)) || "meu-saas";
      projectRoot = resolveNewWorkspace({ cwd: detection.root, name: projectName });
    } else if (!detection.existing) {
      const confirm = await choose(rl, "Esta pasta não parece conter um projeto. Como deseja continuar?", [
        { value: "continue", label: "Usar esta pasta como projeto existente mesmo assim" },
        { value: "new", label: "Criar um novo projeto" },
        { value: "exit", label: "Sair" }
      ], "new");
      if (confirm === "exit") return { cancelled: true };
      if (confirm === "new") {
        projectName = (await ask(rl, "Nome provisório do projeto", false)) || "meu-saas";
        projectRoot = resolveNewWorkspace({ cwd: detection.root, name: projectName });
        mode = "new";
      }
    }

    const task = await choose(rl, "Qual resultado deseja priorizar nesta execução?", TASK_OPTIONS, mode === "new" ? "idea" : "auto");
    const answers = await collectFounderContext(rl, mode);
    if (projectName) answers["Nome provisório do projeto"] = projectName;
    const installedAgents = detectAvailableAgents();
    const agentOptions = installedAgents.length
      ? installedAgents.map(agent => ({ value: agent, label: agent === "claude" ? "Claude Code" : agent === "codex" ? "Codex CLI" : "OpenCode" }))
      : [
          { value: "claude", label: "Claude Code (não detectado; instalar depois)" },
          { value: "codex", label: "Codex CLI (não detectado; instalar depois)" },
          { value: "opencode", label: "OpenCode (não detectado; instalar depois)" }
        ];
    const agent = await choose(rl, "Qual agente deve executar o workflow?", agentOptions, installedAgents[0] ?? "claude");
    const intakePath = appendIntake(projectRoot, mode, answers);
    process.stdout.write("\nWorkspace: " + projectRoot + "\n");
    process.stdout.write("Objetivo: " + task + "\n");
    if (intakePath) process.stdout.write("Intake salvo em: " + intakePath + "\n");

    if (!installedAgents.includes(agent)) {
      const result = await runFoundry({ target: projectRoot, mode, agent, task, launch: false });
      process.stdout.write("\nO workspace e a skill local foram preparados. Instale e autentique o agente escolhido e execute novamente SaaS Foundry nesta pasta.\n");
      return result;
    }
    return await runFoundry({ target: projectRoot, mode, agent, task, launch: true });
  } finally {
    rl.close();
  }
}
