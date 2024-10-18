import { useCallback, useMemo } from 'react';
import { theme, message, Flex, Divider, Card, Button, Tooltip, Typography, Tag, Modal } from 'antd';
import {
  SettingOutlined,
  SyncOutlined,
  ExclamationCircleOutlined,
  CloudDownloadOutlined,
  CloudUploadOutlined,
} from '@ant-design/icons';
import styled from 'styled-components';
import type {
  SyncConfigItemProps,
  SyncConfigProps,
  SyncType,
  SyncStatus,
  SyncStatusProps,
  SyncResultItemProps,
  SyncResultProps,
} from '~/entrypoints/types';
import { classNames } from '~/entrypoints/common/utils';
import { useIntlUtls } from '~/entrypoints/common/hooks/global';
import { syncTypeMap } from '~/entrypoints/common/constants';
import { syncUtils } from '~/entrypoints/common/storage';
import type { RemoteOptionProps, BaseCardItemProps } from './types';
import { remoteOptions } from './constants';
import { StyledLabel } from './Sync.styled';
import { useSyncResult } from './hooks/syncResult';

import { AuthType, createClient } from "webdav";
import type { FileStat } from "webdav";

const StyledTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  .card-title {
    font-weight: bold;
    font-weight: 600;
    font-size: 14px;
  }
`;

function CardItemMarkup({
  option,
  isActive,
  syncConfig,
  syncStatus,
  syncResult,
  onAction,
}: BaseCardItemProps) {
  const [modal, modalContextHolder] = Modal.useModal();
  const [messageApi, msgContextHolder] = message.useMessage();
  const { token } = theme.useToken();
  const { $fmt } = useIntlUtls();
  const lastSyncInfo = useMemo(() => {
    return syncResult?.[0] || {};
  }, [syncResult]);

  const { syncTypeText, syncTypeTipText, variantInfo } = useSyncResult(lastSyncInfo);
  const actionConfirmTextMap: Partial<Record<SyncType, string>> = useMemo(() => {
    return {
      [syncTypeMap.MANUAL_PULL_FORCE]: $fmt('sync.actionTip.manualPullForce'),
      [syncTypeMap.MANUAL_PUSH_FORCE]: $fmt('sync.actionTip.manualPushForce'),
    };
  }, [$fmt]);

  const tokenCheck = useCallback((): boolean => {
    const { github, gitee } = syncUtils.config || {};
    if (option.key === 'github' && !github?.accessToken) {
      messageApi.warning($fmt('sync.noGithubToken'));
      return false;
    } else if (option.key === 'gitee' && !gitee?.accessToken) {
      messageApi.warning($fmt('sync.noGiteeToken'));
      return false;
    }
    return true;
  }, [option]);

  // 操作确认
  const handleConfirm = useCallback(
    async (actionType: SyncType) => {
      if (!tokenCheck()) return;

      const modalConfig = {
        title: $fmt('sync.actionTip'),
        content: actionConfirmTextMap[actionType],
      };
      const confirmed = await modal.confirm(modalConfig);
      if (confirmed) onAction?.(option, actionType);
    },
    [option, onAction]
  );
  // 合并推送
  const handlePushMerge = useCallback(() => {
    if (!tokenCheck()) return;

    onAction?.(option, syncTypeMap['MANUAL_PUSH_MERGE']);
  }, [option]);

  const cardTitle = useMemo(() => {
    return (
      <StyledTitle>
        <div className="card-title">{option.label}</div>
        {syncConfig?.accessToken ? (
          syncStatus === 'syncing' ? (
            <Tag icon={<SyncOutlined spin />} color="processing">
              {$fmt('sync.syncing')}
            </Tag>
          ) : null
        ) : (
          <Tag icon={<ExclamationCircleOutlined />} color="warning">
            {$fmt('sync.noAccessToken')}
          </Tag>
        )}
      </StyledTitle>
    );
  }, [option, syncConfig, syncStatus, $fmt]);

  const description = useMemo(() => {
    return (
      <Flex vertical gap={6}>
        <Typography.Text type="secondary">
          <StyledLabel>{$fmt('sync.lastSyncTime')}: </StyledLabel>
          {lastSyncInfo?.syncTime || $fmt('common.noData')}
        </Typography.Text>
        {lastSyncInfo?.syncTime && lastSyncInfo?.syncType && (
          <>
            <Typography.Text type="secondary">
              <StyledLabel>{$fmt('sync.lastSyncType')}: </StyledLabel>
              <Tooltip
                color={token.colorBgElevated}
                destroyTooltipOnHide
                title={<Typography.Text>{syncTypeTipText}</Typography.Text>}
              >
                <Tag color="blue">{syncTypeText}</Tag>
              </Tooltip>
            </Typography.Text>
            <Typography.Text type="secondary">
              <StyledLabel>{$fmt('sync.lastSyncResult')}: </StyledLabel>
              <Tag color={variantInfo.variant}>{variantInfo.text}</Tag>
            </Typography.Text>
            {lastSyncInfo.reason && (
              <Typography.Text type="danger">
                <StyledLabel>{$fmt('common.failedReason')}: </StyledLabel>
                {lastSyncInfo.reason}
              </Typography.Text>
            )}
          </>
        )}
      </Flex>
    );
  }, [lastSyncInfo, syncTypeText, syncTypeTipText, variantInfo, $fmt]);

  const actions = useMemo(() => {
    return [
      <Tooltip
        color={token.colorBgElevated}
        destroyTooltipOnHide
        title={<Typography.Text>{$fmt('common.settings')}</Typography.Text>}
      >
        <div className="icon-btn-wrapper" onClick={() => onAction?.(option, 'setting')}>
          <SettingOutlined key="setting" />
        </div>
      </Tooltip>,
      <Tooltip
        color={token.colorBgElevated}
        destroyTooltipOnHide
        title={<Typography.Text>{$fmt('sync.tip.manualPullForce')}</Typography.Text>}
      >
        <div
          className="icon-btn-wrapper"
          onClick={() => handleConfirm(syncTypeMap['MANUAL_PULL_FORCE'])}
          // onClick={() => onAction?.(option, syncTypeMap['MANUAL_PULL_FORCE'])}
        >
          <CloudDownloadOutlined key={syncTypeMap['MANUAL_PULL_FORCE']} />
        </div>
      </Tooltip>,
      <Tooltip
        color={token.colorBgElevated}
        destroyTooltipOnHide
        title={<Typography.Text>{$fmt('sync.tip.manualPushMerge')}</Typography.Text>}
      >
        <div className="icon-btn-wrapper" onClick={handlePushMerge}>
          <SyncOutlined key={syncTypeMap['MANUAL_PUSH_MERGE']} />
        </div>
      </Tooltip>,
      <Tooltip
        color={token.colorBgElevated}
        destroyTooltipOnHide
        title={<Typography.Text>{$fmt('sync.tip.manualPushForce')}</Typography.Text>}
      >
        <div
          className="icon-btn-wrapper"
          onClick={() => handleConfirm(syncTypeMap['MANUAL_PUSH_FORCE'])}
          // onClick={() => onAction?.(option, syncTypeMap['MANUAL_PUSH_FORCE'])}
        >
          <CloudUploadOutlined key={syncTypeMap['MANUAL_PUSH_FORCE']} />
        </div>
      </Tooltip>,
    ];
  }, [option, onAction, $fmt]);

  return (
    <>
      {msgContextHolder}
      {modalContextHolder}
      <Card
        className={classNames('card-item', isActive && 'active')}
        hoverable
        classNames={{
          actions: 'card-actions',
        }}
        onClick={() => onAction?.(option, 'select')}
        actions={actions}
      >
        <Card.Meta title={cardTitle} description={description} />
      </Card>
    </>
  );
}

const StyledCard = styled.div`
  .card-item {
    border-color: ${(props) => props.theme.colorBorder};
    &.active {
      border-color: ${(props) => props.theme.colorPrimary};
    }
    .icon-btn-wrapper {
      padding: 4px;
    }
  }
`;

type SideBarContentProps = {
  selectedKey?: string;
  syncConfig: SyncConfigProps;
  syncStatus: SyncStatusProps;
  syncResult: SyncResultProps;
  onAction?: (option: RemoteOptionProps, actionType: string) => void;
};

export default function SidebarContent({
  selectedKey,
  syncConfig,
  syncStatus,
  syncResult,
  onAction,
}: SideBarContentProps) {
  const handleAction = useCallback(
    (option: RemoteOptionProps, actionType: string) => {
      onAction?.(option, actionType);
    },
    [onAction]
  );

  const handleDavAction = async (action: string) => {
    console.log('handleDavAction');
    const serverUrl = 'https://gima.teracloud.jp/dav/';
    const username = 'wwwppp';
    const password = 'gUgnNGBAk2r9YtU9';
    // const directory = '/nicetab';

    // const fileName = `${directory?.replace(/\/$/, '') || ''}/${syncUtils.gistFileName}`;
    const directory = '/test/a';

    const fileName = `${directory?.replace(/\/$/, '') || ''}/github-hosts`;
    console.log('fileName', fileName);

    // const recursiveHandler = async (path: string, handler: (pathStr: string) => Promise<boolean>) => {
    //   const pathList = path.split('/').filter(Boolean);
    //   let _path = '';
    //   for (let i = 0; i < pathList.length; i++) {
    //     _path += `/${pathList[i]}`;
    //     const result = await handler(_path);
    //     if (!result) return false;
    //   }
    //   return true;
    // }
    const recursiveHandler = async (path: string, handler: (pre: string, curr: string) => Promise<boolean>) => {
      const pathList = path.split('/').filter(Boolean);
      let _path = '/';
      for (let i = 0; i < pathList.length; i++) {
        const result = await handler(_path, pathList[i]);
        console.log('result-inner', result);
        if (!result) return false;
        _path += `${pathList[i]}/`;
      }
      return true;
    }

    const client = createClient(serverUrl, {
      authType: AuthType.Auto,
      username,
      password
    });

    const isDirExists = await recursiveHandler(directory, async (pre, curr) => {
      console.log('recursiveHandler-traverse-handler', pre, curr);
      const contentList = await client.getDirectoryContents(pre) as FileStat[];
      console.log('recursiveHandler-traverse-contentList', contentList);
      return contentList.some((item) => item.basename === curr);
    });
    // let isDirExists = await client.exists(directory);
    console.log('isDirExists', isDirExists);
    return
    if (!isDirExists) {
      const createDirectoryres =  await client.createDirectory(directory, { recursive : true });
      console.log('createDirectoryres', createDirectoryres);
    }

    const isFileExists = await client.exists(fileName);
    console.log('isFileExists', isFileExists);
    if (!isFileExists) {
      const putFileContentsRes = await client.putFileContents(fileName, 'default content');
      console.log('putFileContentsRes--1', putFileContentsRes);
    }

    if (action === 'delete') {
      const deleteFileRes = await client.deleteFile(directory);
      console.log('deleteFileRes', deleteFileRes);
    } else if (action === 'getFileContents') {
      console.log('getFileContents');
      const fileContent = await client.getFileContents(fileName, { format: "text" }) as string;
      console.log('fileContent', fileContent);
    } else if (action === 'putFileContents') {
      const putFileContentsRes = await client.putFileContents(fileName, '{a: 1, b: 2}');
      console.log('putFileContentsRes', putFileContentsRes);
    }
  };

  return (
    <Flex vertical gap={24}>
      <Flex vertical>
        <Divider><Typography.Text strong>Gists</Typography.Text></Divider>
        <Flex vertical gap={12}>
          {remoteOptions.map((option) => (
            <StyledCard key={option.key}>
              <CardItemMarkup
                option={option}
                isActive={selectedKey === option.key}
                syncConfig={syncConfig?.[option.key] || {}}
                syncStatus={syncStatus?.[option.key] || {}}
                syncResult={syncResult?.[option.key] || []}
                onAction={handleAction}
              ></CardItemMarkup>
            </StyledCard>
          ))}
        </Flex>
      </Flex>

      <Flex vertical>
        <Divider><Typography.Text strong>webDAV</Typography.Text></Divider>
        <div>
          <Button onClick={() => handleDavAction('delete')}>delete dir</Button>
          <Button onClick={() => handleDavAction('getFileContents')}>getFileContents</Button>
          <Button onClick={() => handleDavAction('putFileContents')}>putFileContents</Button>
        </div>
      </Flex>
    </Flex>
  );
}
