// Avisos no aparelho (opt-in). Tudo acontece aqui: a verificação roda no próprio aparelho, a partir das APIs públicas,
// e o aviso é local. Nada é enviado a servidor nenhum. O sistema decide quando a tarefa em segundo plano roda
// (no mínimo a cada 15 minutos no Android, e sem garantia de horário), então o aviso pode atrasar.
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as BackgroundTask from 'expo-background-task';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';

import { runCheck, type CheckDeps, type Notice } from './notify-core';
import { STORAGE_KEY } from './store';

export const TASK_NAME = 'monitor-cidadao-alertas';
const CHANNEL = 'alertas';
const supported = Platform.OS !== 'web';

const deps: CheckDeps = {
  load: async () => {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  },
  save: (s) => AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(s)),
  send: async (n: Notice) => {
    await Notifications.scheduleNotificationAsync({ content: { title: n.title, body: n.body }, trigger: null });
  },
};

// A tarefa precisa ser definida no escopo global, antes de o app montar (importado em _layout.tsx).
if (supported) {
  TaskManager.defineTask(TASK_NAME, async () => {
    try {
      await runCheck(deps);
      return BackgroundTask.BackgroundTaskResult.Success;
    } catch {
      return BackgroundTask.BackgroundTaskResult.Failed;
    }
  });
}

export type EnableResult = 'on' | 'denied' | 'unsupported';

/** Pede permissão, cria o canal, guarda o que já existe sem avisar e agenda a verificação periódica. */
export async function enableNotifications(): Promise<EnableResult> {
  if (!supported) return 'unsupported';
  const current = await Notifications.getPermissionsAsync();
  const granted = current.granted || (await Notifications.requestPermissionsAsync()).granted;
  if (!granted) return 'denied';
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL, { name: 'Alertas do Congresso', importance: Notifications.AndroidImportance.DEFAULT });
  }
  await runCheck(deps, { silent: true }).catch(() => 0);
  await BackgroundTask.registerTaskAsync(TASK_NAME, { minimumInterval: 60 });
  return 'on';
}

export async function disableNotifications(): Promise<void> {
  if (!supported) return;
  if (await TaskManager.isTaskRegisteredAsync(TASK_NAME)) await BackgroundTask.unregisterTaskAsync(TASK_NAME);
}

export const notificationsSupported = supported;
