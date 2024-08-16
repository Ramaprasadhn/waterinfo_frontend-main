"use client";
import React, { useContext, useEffect, useRef, useState } from "react";
import { Button, Form, Input, message, Table } from "antd";
import { FormInstance } from "antd/lib/form";
import { ColumnType as AntColumnType } from "antd/lib/table";
import { Input as AntInput, InputRef } from "antd";
import axios from "axios";
import { notification } from "antd";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
} from "@ant-design/icons";

const openNotification = (
  type: string,
  message: string,
  description: string
) => {
  let icon;
  if (type === "success") {
    icon = <CheckCircleOutlined style={{ color: "green" }} />;
  } else if (type === "error") {
    icon = <CloseCircleOutlined style={{ color: "red" }} />;
  } else if (type === "warning") {
    icon = <WarningOutlined style={{ color: "orange" }} />;
  }

  let bigMessage;
  bigMessage = <div className="tw-text-xl">{message}</div>;

  let desc;
  desc = <div className="tw-text-base">{description}</div>;

  notification.open({
    message: bigMessage,
    description: desc,
    icon: icon,
  });
};

interface DataType {
  key: string;
  substance: string;
  unit: string;
  year: string;
  mcl: string;
  mclg: string;
  amountDetected: string;
  range: string;
  violation: string;
  typicalSource: string;
}

interface EditableCellProps extends React.HTMLAttributes<HTMLElement> {
  title: string | undefined;
  editable: boolean;
  children: React.ReactNode;
  dataIndex: keyof DataType;
  record: DataType;
  handleSave: (record: DataType) => void;
}

interface ColumnType<T> extends AntColumnType<T> {
  editable?: boolean;
}

const EditableContext = React.createContext<FormInstance<any> | null>(null);

const EditableRow: React.FC<{ index: number }> = ({ index, ...props }) => {
  const [form] = Form.useForm();
  return (
    <Form form={form} component={false}>
      <EditableContext.Provider value={form}>
        <tr {...props} />
      </EditableContext.Provider>
    </Form>
  );
};

const EditableCell: React.FC<EditableCellProps> = ({
  title,
  editable,
  children,
  dataIndex,
  record,
  handleSave,
  ...restProps
}) => {
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<InputRef>(null);
  const form = useContext(EditableContext)!;

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
    }
  }, [editing]);

  const toggleEdit = () => {
    setEditing(!editing);
    form.setFieldsValue({ [dataIndex]: record[dataIndex] });
  };

  const save = async () => {
    try {
      const values = await form.validateFields();
      toggleEdit();
      handleSave({ ...record, ...values });
    } catch (errInfo) {
      console.log("Save failed:", errInfo);
    }
  };

  let childNode = children;

  if (editable) {
    childNode = editing ? (
      <Form.Item
        style={{ margin: 0 }}
        name={dataIndex}
        rules={[{ required: true, message: `${title} is required.` }]}
      >
        <Input ref={inputRef} onPressEnter={save} onBlur={save} />
      </Form.Item>
    ) : (
      <div
        className="editable-cell-value-wrap"
        style={{ paddingRight: 24 }}
        onClick={toggleEdit}
      >
        {children}
      </div>
    );
  }

  return <td {...restProps}>{childNode}</td>;
};

const generateRandomNumber = (min: number, max: number) =>
  (Math.random() * (max - min) + min).toFixed(2);

const getRandomViolation = () => (Math.random() > 0.5 ? "Yes" : "No");

const substances = [
  "Atrazine (ppb)",
  "Barium (ppm)",
  "Chlorine (ppm)",
  "Chlorite (ppm)",
  "Fluoride (ppm)",
  "Haloacetic acids [HAAs] - Stage 2",
  "Nitrate (ppm)",
  "Sodium (ppm)",
  "Total Coliform Bacteria (positive samples)",
  "Total Organic Carrbon [TOC] (ppm)",
  "TTHMs [Total trihalomethanes] - Stage 2 (ppb)",
  "Turbidity (NTU)",
  "Turbidity (lowest monthly percent of samples meeting limit)",
];

const generateData = () => {
  return substances.map((substance, index) => ({
    key: index.toString(),
    substance: substance,
    unit: generateRandomNumber(1, 5),
    year: (2020 + Math.floor(Math.random() * 5)).toString(),
    mcl: generateRandomNumber(1, 10),
    mclg: generateRandomNumber(1, 10),
    amountDetected: generateRandomNumber(0, 5),
    range: `${generateRandomNumber(0, 1)}–${generateRandomNumber(1, 5)}`,
    violation: getRandomViolation(),
    typicalSource: "Runoff from herbicide used on row crops", // You can replace this with actual data if needed
  }));
};

const App: React.FC = () => {
  const [dataSource, setDataSource] = useState<DataType[]>([]);
  const [buttonDisabled, setButtonDisabled] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();

  useEffect(() => {
    setDataSource(generateData());
  }, []);

  const handleSave = (row: DataType) => {
    const newData = [...dataSource];
    const index = newData.findIndex((item) => row.key === item.key);
    const item = newData[index];
    newData.splice(index, 1, { ...item, ...row });
    setDataSource(newData);
  };

  const handleSaveClick = async () => {
    setButtonDisabled(true);
    const formattedData = {
      doc: [
        {
          id: "",
          rowdata: dataSource.map((item, index) => ({
            id: (index + 1).toString(),
            substance: item.substance,
            unit: item.unit,
            year: item.year,
            mcl: item.mcl,
            mclg: item.mclg,
            amountDetected: item.amountDetected,
            range: item.range,
            violation: item.violation,
            typicalSource: `${item.typicalSource}`,
          })),
        },
      ],
    };

    try {
      // Post data to the server
      const response = await axios.post(
        "https://waterinfowebapp.azurewebsites.net/WaterInfolist",
        formattedData
      );

      console.log("Response:", response.data);

      // Check for successful response
      if (response.status === 200) {
        openNotification(
          "success",
          "Saved",
          "Table Saved Successfully and Ready to Download! Opening in New Tab."
        );

        // Extract the ID from the response string
        const responseData = response.data as string;
        const match = responseData.match(/Record Created : (\d+)/);
        if (match) {
          const id = match[1];
          const downloadLink = `https://waterinfowebapp.azurewebsites.net/getpdfoutput?id=${id}`;

          // Fetch the download link for the DOC file
          const downloadResponse = await axios.get(downloadLink);

          // Assuming the response contains the URL or file link
          const fileLink = downloadResponse.data as string; // Adjust based on the actual response structure

          // Provide the download link (e.g., open in a new tab)
          window.open(fileLink, "_blank");

          console.log("Success and download link:", fileLink);
        } else {
          openNotification(
            "error",
            "Error",
            "Failed to extract ID from response"
          );
          console.error("Failed to extract ID from response:", responseData);
        }
      }
    } catch (error) {
      openNotification(
        "error",
        "Error",
        "Failed to extract ID from Error posting data or fetching download link"
      );
      console.error("Error posting data or fetching download link:", error);
    } finally {
      setButtonDisabled(false);
    }

    console.log(formattedData);
  };

  const defaultColumns: ColumnType<DataType>[] = [
    {
      title: "Substance",
      dataIndex: "substance",
      render: (text: string) => <p className="font-semibold">{text}</p>,
    },
    {
      title: "Year Sampled",
      dataIndex: "year",
      editable: true,
    },
    {
      title: "MCL [MRDL]",
      dataIndex: "mcl",
      editable: true,
    },
    {
      title: "MCLG [MRDLG]",
      dataIndex: "mclg",
      editable: true,
    },
    {
      title: "Amount Detected",
      dataIndex: "amountDetected",
      editable: true,
    },
    {
      title: "Range (Low-High)",
      dataIndex: "range",
      editable: true,
    },
    {
      title: "Violation",
      dataIndex: "violation",
      editable: true,
    },
    {
      title: "Typical Source",
      dataIndex: "typicalSource",
      editable: true,
    },
  ];

  const columns = defaultColumns.map((col) => {
    if (!col.editable) {
      return col;
    }
    return {
      ...col,
      onCell: (record: DataType) => ({
        record,
        editable: col.editable,
        dataIndex: col.dataIndex,
        title: col.title,
        handleSave,
      }),
    };
  });

  const components = {
    body: {
      row: EditableRow,
      cell: EditableCell,
    },
  };

  return (
    <div className="p-10">
      <div className="flex justify-between">
        <Button
          onClick={handleSaveClick}
          type="primary"
          style={{
            marginBottom: 16,
            marginLeft: 8,
            marginRight: 8,
            backgroundColor: "green",
          }}
          disabled={buttonDisabled}
        >
          Save
        </Button>
      </div>

      <Table
        components={components}
        rowClassName={() => "editable-row"}
        bordered
        size="small"
        dataSource={dataSource}
        columns={columns as any}
        pagination={false}
      />
    </div>
  );
};

export default App;
