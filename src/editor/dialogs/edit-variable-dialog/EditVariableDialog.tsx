import '../editor-dialog.scss';
import './EditVariableDialog.scss';
import React, { useState } from 'react';
import { ActionCreators } from '../../../state/reducer';
import {
  IDETemplateEntity,
  CurrentVariables,
  IDEVariable
} from '../../../state/types';
import {
  Classes,
  Dialog,
  FormGroup,
  InputGroup,
  Button,
  Icon,
  Intent,
  Alert,
  EditableText,
  HTMLSelect
} from '@blueprintjs/core';
import { IconNames } from '@blueprintjs/icons';
import {
  sanitizeId,
  variableIcon,
  wrapInterfaceTooltip,
  compileScriptMock
} from '../../common';
import { unknownValue } from '../../../utils';
import { binToHex } from 'bitcoin-ts';

const variableTypes: {
  label: string;
  value: IDEVariable['type'];
  disabled?: boolean;
}[] = [
  { label: 'HD Key (Not Yet Available)', value: 'HDKey', disabled: true },
  { label: 'Key', value: 'Key' },
  { label: 'Address Data', value: 'AddressData' },
  { label: 'Wallet Data', value: 'WalletData' }
];

const variableTypeDescriptions: {
  [key in IDEVariable['type']]: React.ReactNode;
} = {
  AddressData: (
    <span>
      <p>
        Address Data is the most low-level variable type. It must be collected
        and stored each time a script is generated (usually, a locking script).
      </p>
      <p>
        Address Data can include any type of data, and can be used in any way.
        For more persistent data, use <code>WalletData</code>.
      </p>
    </span>
  ),
  HDKey:
    'The HD Key (Hierarchical-Deterministic Key) type automatically manages key generation and mapping in a standard way. For greater control, use a Key. (NOTE: HDKey is not yet supported by Bitauth IDE.)',
  Key: (
    <span>
      <p>
        The Key type provides fine-grained control over key generation and
        mapping. Most templates should instead use <code>HDKey</code>.
      </p>
      <p>
        When using the Key type, any necessary HD (Hierarchical-Deterministic)
        derivation must be completed prior to compilation.
      </p>
    </span>
  ),
  WalletData: (
    <span>
      <p>
        The Wallet Data type provides a static piece of data – collected once
        and stored at the time of wallet creation.
      </p>
      <p>
        Wallet Data is persisted for the life of the wallet, rather than
        changing from locking script to locking script. For address-specific
        data, use <code>AddressData</code>.
      </p>
    </span>
  )
};

/**
 * The key must be 32 bytes (64 hex characters), and it must be less than or equal to:
 * `0xFFFF FFFF FFFF FFFF FFFF FFFF FFFF FFFE BAAE DCE6 AF48 A03B BFD2 5E8C D036 4140`
 *  TODO: update
 */
const isValidEnoughPrivateKey = (key: string) => true;

const onesKey =
  '0x1111111111111111111111111111111111111111111111111111111111111111';

export const EditVariableDialog = ({
  entity,
  currentVariables,
  variableInternalId,
  variable,
  isOpen,
  closeDialog,
  upsertVariable,
  deleteVariable
}: {
  entity: IDETemplateEntity;
  currentVariables: CurrentVariables;
  variableInternalId?: string;
  variable?: IDEVariable;
  isOpen: boolean;
  closeDialog: () => any;
  upsertVariable: typeof ActionCreators.upsertVariable;
  deleteVariable: typeof ActionCreators.deleteVariable;
}) => {
  const [variableName, setVariableName] = useState(
    (variable && variable.name) || ''
  );
  const [variableDescription, setVariableDescription] = useState(
    (variable && variable.description) || ''
  );
  const [variableId, setVariableId] = useState((variable && variable.id) || '');
  const [variableType, setVariableType] = useState(
    (variable && variable.type) || 'Key'
  );
  const [variableMock, setVariableMock] = useState(
    (variable && variable.mock) || onesKey
  );
  const [variableMockHex, setVariableMockHex] = useState('');
  const [variableMockError, setVariableMockError] = useState('');
  const [nonUniqueId, setNonUniqueId] = useState('');
  const [promptDelete, setPromptDelete] = useState(false);
  return (
    <Dialog
      className="bp3-dark editor-dialog EditVariableDialog"
      onOpening={() => {
        setVariableName((variable && variable.name) || '');
        setVariableDescription((variable && variable.description) || '');
        setVariableId((variable && variable.id) || '');
        setVariableType((variable && variable.type) || 'AddressData');
        setVariableMock((variable && variable.mock) || onesKey);
        setVariableMockHex('');
        setVariableMockError('');
        setNonUniqueId('');
      }}
      onClose={() => {
        closeDialog();
      }}
      title={!variableInternalId ? 'Create Variable' : 'Edit Variable'}
      isOpen={isOpen}
      canOutsideClickClose={false}
    >
      <div className={Classes.DIALOG_BODY}>
        <FormGroup
          helperText={variableTypeDescriptions[variableType]}
          label="Variable Type"
          labelFor="variable-type"
          inline={true}
        >
          <HTMLSelect
            id="variable-type"
            options={variableTypes}
            value={variableType}
            onChange={e => {
              const type = e.currentTarget.value as IDEVariable['type'];
              setVariableType(type);
              switch (type) {
                case 'HDKey':
                  if (variableName === '')
                    setVariableName(`${entity.name}'s HD Key`);
                  setVariableId(`${entity.id}_hdkey`);
                  break;
                case 'Key':
                  if (variableName === '')
                    setVariableName(`${entity.name}'s Key`);
                  setVariableId(`${entity.id}_key`);
                  break;
                case 'AddressData':
                case 'WalletData':
                  setVariableId('');
                  break;
                default:
                  unknownValue(type);
              }
            }}
          />
        </FormGroup>
        <div className="divider" />
        <h3 className="name">
          {wrapInterfaceTooltip(
            <Icon icon={variableIcon(variableType)} iconSize={12} />,
            variableType
          )}
          <EditableText
            maxLength={100}
            placeholder="Variable Name"
            selectAllOnFocus={true}
            value={variableName}
            onChange={name => {
              setVariableName(name);
              if (variableInternalId === undefined) {
                setVariableId(sanitizeId(name));
              }
            }}
          />
        </h3>
        <div className="description">
          <EditableText
            maxLength={1000}
            minLines={3}
            multiline={true}
            placeholder="A brief description of this variable..."
            selectAllOnFocus={true}
            value={variableDescription}
            onChange={description => setVariableDescription(description)}
          />
        </div>
        <div className="divider" />
        <FormGroup
          helperText={
            <span>
              A unique variable identifier (must begin with a-z, A-Z, or
              <code>_</code>, remaining characters may include numbers,
              <code>.</code>, and
              <code>-</code>). This is used to reference the variable from
              within scripts.
            </span>
          }
          label="Variable ID"
          labelFor="variable-id"
          inline={true}
        >
          <InputGroup
            id="variable-id"
            value={variableId}
            autoComplete="off"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              const value = e.target.value;
              setVariableId(sanitizeId(value));
            }}
          />
        </FormGroup>
        <FormGroup
          helperText={
            <span>
              {variableMockError !== '' ? (
                <p>{variableMockError}</p>
              ) : (
                variableMockHex !== '' && (
                  <p>
                    Result: <code className="result">0x{variableMockHex}</code>
                  </p>
                )
              )}
              {variableType === 'Key' ? (
                <p>
                  A valid, testing private key encoded in BTL. (E.g. as a
                  HexLiteral, this will be
                  <code>0x[64 characters]</code>. Test values must fall within
                  the allowed range for Secp256k1.)
                </p>
              ) : variableType === 'WalletData' ||
                variableType === 'AddressData' ? (
                <p>
                  A testing value for this{' '}
                  {variableType === 'AddressData' ? 'Address' : 'Wallet'} Data,
                  encoded in BTL. E.g. a bigint literal like <code>123</code>, a
                  hex literal like <code>0xc0de</code>, a UTF8 string like{' '}
                  <code>'test'</code>, or even a push like{' '}
                  <code>&lt;"abc"&gt;</code>.
                </p>
              ) : (
                ''
              )}
              <p>
                This is used during development in Bitauth IDE, and is exported
                as part of the authentication template.
              </p>
            </span>
          }
          label="IDE Value"
          labelFor="variable-value"
          inline={true}
        >
          <InputGroup
            id="variable-value"
            value={variableMock}
            autoComplete="off"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              const value = e.target.value;
              setVariableMock(value);
              const compiled = compileScriptMock(value);
              if (compiled.success) {
                setVariableMockError('');
                setVariableMockHex(binToHex(compiled.bytecode));
              } else {
                setVariableMockError(
                  `Compilation error${
                    compiled.errors.length > 1 ? 's' : ''
                  }: ${compiled.errors
                    .map(
                      ({ error, range }) =>
                        `${error} [${range.startLineNumber}, ${range.startColumn}]`
                    )
                    .join(', ')}`
                );
              }
            }}
          />
        </FormGroup>
        {variableInternalId && variable !== undefined && (
          <div>
            <Button
              className="ide-secondary-button delete-item-button"
              onClick={() => {
                setPromptDelete(true);
              }}
            >
              <Icon icon={IconNames.TRASH} iconSize={10} />
              Delete Variable
            </Button>
            <Alert
              cancelButtonText="Cancel"
              confirmButtonText="Delete Variable"
              intent={Intent.DANGER}
              isOpen={promptDelete}
              canEscapeKeyCancel={true}
              canOutsideClickCancel={true}
              onCancel={() => setPromptDelete(false)}
              onConfirm={() => {
                deleteVariable(variableInternalId);
                setPromptDelete(false);
                closeDialog();
              }}
            >
              <p>
                Are you sure you want to delete the variable “{variable.name}”?
              </p>
              <p>This cannot be undone.</p>
            </Alert>
          </div>
        )}
      </div>
      <div className={Classes.DIALOG_FOOTER}>
        <div className={Classes.DIALOG_FOOTER_ACTIONS}>
          <div className="error">
            {nonUniqueId === '' ? (
              <span />
            ) : (
              <span>
                <Icon icon={IconNames.WARNING_SIGN} iconSize={12} />
                The Variable ID <code>{nonUniqueId}</code> is already in use.
              </span>
            )}
          </div>
          <Button
            disabled={
              variableId === '' ||
              variableMock === '' ||
              variableMockError !== '' ||
              (variableType === 'Key' &&
                !isValidEnoughPrivateKey(variableMock)) ||
              variableType === 'HDKey'
            }
            onClick={() => {
              /**
               * TODO: we should really be tracking all "usedIds" together rather than
               * tracking variable, entity, and script IDs separately. Entity ID's can
               * overlap with the others, but variable and script IDs conflict. (Currently,
               * the compiler assumes you meant the variable if a conflict arises.)
               */
              const usedIds = currentVariables
                .map(v => v.id)
                .filter(id => variable === undefined || variable.id !== id);
              if (usedIds.indexOf(variableId) !== -1) {
                setNonUniqueId(variableId);
              } else {
                upsertVariable({
                  owningEntityInternalId: entity.internalId,
                  internalId: variableInternalId,
                  name: variableName,
                  description: variableDescription,
                  id: variableId,
                  type: variableType,
                  mock: variableMock
                });
                closeDialog();
              }
            }}
          >
            {variableInternalId ? 'Save Changes' : 'Create Variable'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
