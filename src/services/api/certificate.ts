import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { env } from '../../lib/env';
import { getCurrentSession } from '../auth';
import { ApiError } from './client';

// Nome local do arquivo dentro de Paths.cache. Sobrescrevemos a cada download
// (não persistimos: sempre buscamos uma versão fresca do servidor para
// refletir mudanças de nome no perfil, etc.).
const LOCAL_FILENAME = 'certificado-ciclorota.pdf';

// O método estático File.downloadFileAsync é atribuído em runtime no pacote
// expo-file-system e não aparece nos tipos do .ts-source. Casting local
// mantém a chamada tipada para nós, sem afetar o resto do app.
type DownloadOptions = {
  headers?: Record<string, string>;
  idempotent?: boolean;
};
type DownloadedFile = { uri: string };
type FileWithDownload = typeof File & {
  downloadFileAsync(
    url: string,
    destination: File,
    options?: DownloadOptions,
  ): Promise<DownloadedFile>;
};

/**
 * Baixa o PDF do certificado do usuário autenticado para o cache do app
 * e retorna o arquivo local. Lança ApiError em caso de falha HTTP.
 */
export async function downloadMyCertificatePdf(): Promise<DownloadedFile> {
  const session = await getCurrentSession();
  const accessToken = session?.access_token;

  if (!accessToken) {
    throw new ApiError('Sessão expirada. Faça login novamente.', 401);
  }

  const url = `${env.apiUrl}/me/certificates/pdf`;
  const destination = new File(Paths.cache, LOCAL_FILENAME);
  const FileApi = File as FileWithDownload;

  try {
    return await FileApi.downloadFileAsync(url, destination, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/pdf',
      },
      idempotent: true,
    });
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : 'Não foi possível baixar o certificado.';
    throw new ApiError(message, 0);
  }
}

/**
 * Baixa o PDF e abre a folha de compartilhamento nativa para o usuário
 * salvar ou enviar o arquivo (Arquivos, WhatsApp, e-mail etc.).
 */
export async function shareMyCertificatePdf(): Promise<void> {
  const file = await downloadMyCertificatePdf();

  const sharingAvailable = await Sharing.isAvailableAsync();
  if (!sharingAvailable) {
    throw new ApiError(
      'Compartilhamento indisponível neste dispositivo. O arquivo foi salvo no cache do app.',
      500,
    );
  }

  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/pdf',
    UTI: 'com.adobe.pdf',
    dialogTitle: 'Salvar ou compartilhar certificado',
  });
}
