import { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import {
  Form,
  InputGroup,
  Button,
  ButtonToolbar,
  Accordion
} from "react-bootstrap";

export default function ApplicationForm({
  application,
  creating,
  onSubmit,
  children
}) {
  const [id] = useState(() => `application_form_${uuidv4()}`);
  const [name, setName] = useState(application?.name || "");
  const [hostname, setHostname] = useState(String(application?.hostname || ""));
  const [command, setCommand] = useState(application?.command || "");
  const [ssl, setSsl] = useState(Boolean(application?.ssl));
  const [port, setPort] = useState(
    () => application?.port || 2000 + Math.floor(Math.random() * 1000)
  );
  const [out, setOut] = useState(application?.out || "");
  const [timeoutSecs, setTimeoutSecs] = useState(application?.timeout || "");
  const [dir, setDir] = useState(application?.dir || "");
  const [env, setEnv] = useState(application?.env || {});
  const [envSearch, setEnvSearch] = useState("");
  const [envNewKey, setEnvNewKey] = useState("");

  const isNameValid = name.match(/^[a-z\d][a-z\d-]*[a-z\d]$/);
  const isCommandValid = !!command;
  const isPortValid = !isNaN(port);
  const isValid = isNameValid && isCommandValid && isPortValid;

  function handleAddEnvKey() {
    if (!envNewKey) return;
    setEnv(prev => ({ ...prev, [envNewKey]: "" }));
    setEnvNewKey("");
  }

  return (
    <Form
      onSubmit={ev => {
        ev.preventDefault();
        onSubmit({
          name,
          hostname,
          ssl,
          command,
          port,
          out,
          timeout: timeoutSecs,
          dir,
          env
        });
      }}
    >
      <Form.Group controlId={`${id}_name`} className="mb-3">
        <Form.Label>Name:</Form.Label>
        <Form.Control
          type="text"
          required
          readOnly={!creating}
          value={name}
          isValid={!!isNameValid}
          isInvalid={!isNameValid}
          onChange={ev => setName(ev.target.value)}
        />
      </Form.Group>
      <Form.Group controlId={`${id}_hostname`} className="mb-3">
        <Form.Label>Hostname:</Form.Label>
        <Form.Control
          type="text"
          value={hostname}
          onChange={ev => setHostname(ev.target.value)}
          placeholder={`${name}.test`}
        />
      </Form.Group>
      <Form.Check
        className="mb-3"
        type="checkbox"
        id={`${id}_ssl`}
        label="SSL"
        checked={ssl}
        onChange={ev => setSsl(ev.target.checked)}
      />
      <Form.Group controlId={`${id}_command`} className="mb-3">
        <Form.Label>Command:</Form.Label>
        <Form.Control
          type="text"
          value={command}
          isValid={!!isCommandValid}
          isInvalid={!isCommandValid}
          onChange={ev => setCommand(ev.target.value)}
        />
      </Form.Group>
      <Form.Group controlId={`${id}_dir`} className="mb-3">
        <Form.Label>Working directory:</Form.Label>
        <Form.Control
          type="text"
          value={dir}
          onChange={ev => setDir(ev.target.value)}
        />
      </Form.Group>
      <Form.Group controlId={`${id}_out`} className="mb-3">
        <Form.Label>Output path (optional):</Form.Label>
        <Form.Control
          type="text"
          value={out}
          onChange={ev => setOut(ev.target.value)}
        />
      </Form.Group>
      <Form.Group controlId={`${id}_timeout`} className="mb-3">
        <Form.Label>
          Timeout (idle seconds before shutting the application down, optional):
        </Form.Label>
        <Form.Control
          type="number"
          min={0}
          step={1}
          value={timeoutSecs}
          onChange={ev => setTimeoutSecs(Number(ev.target.value) || "")}
        />
      </Form.Group>
      <Form.Group controlId={`${id}_port`} className="mb-3">
        <Form.Label>Port:</Form.Label>
        <Form.Control
          type="number"
          min={1000}
          value={port}
          isValid={isPortValid}
          isInvalid={!isPortValid}
          onChange={ev => setPort(Number(ev.target.value))}
        />
      </Form.Group>
      <Accordion className="mb-3">
        <Accordion.Item eventKey="0">
          <Accordion.Header>Environment</Accordion.Header>
          <Accordion.Body>
            <Form.Group className="mb-3">
              <Form.Control
                type="text"
                value={envSearch}
                placeholder="type to search..."
                onChange={ev => setEnvSearch(ev.target.value)}
              />
            </Form.Group>
            {Object.keys(env)
              .filter(
                k =>
                  k.toLowerCase().indexOf(envSearch.toLowerCase()) !== -1
              )
              .sort()
              .map(envKey => (
                <Form.Group
                  key={envKey}
                  controlId={`${id}_env_${envKey}`}
                  className="mb-2"
                >
                  <Form.Label>{envKey}:</Form.Label>
                  <InputGroup>
                    <Form.Control
                      type="text"
                      value={env[envKey]}
                      onChange={ev =>
                        setEnv(prev => ({ ...prev, [envKey]: ev.target.value }))
                      }
                    />
                    <Button
                      variant="outline-secondary"
                      onClick={() =>
                        setEnv(prev => {
                          const next = { ...prev };
                          delete next[envKey];
                          return next;
                        })
                      }
                    >
                      Delete
                    </Button>
                  </InputGroup>
                </Form.Group>
              ))}
          </Accordion.Body>
        </Accordion.Item>
      </Accordion>
      <InputGroup className="mb-3">
        <Form.Control
          type="text"
          placeholder="new environment variable"
          value={envNewKey}
          onChange={ev => setEnvNewKey(ev.target.value)}
          onKeyDown={ev => {
            if (ev.key !== "Enter") return;
            ev.preventDefault();
            handleAddEnvKey();
          }}
        />
        <Button onClick={handleAddEnvKey}>Add environment variable</Button>
      </InputGroup>
      <ButtonToolbar className="gap-2">
        <Button variant="primary" type="submit" disabled={!isValid}>
          {creating ? "Create" : "Save changes"}
        </Button>
        {children}
      </ButtonToolbar>
    </Form>
  );
}
