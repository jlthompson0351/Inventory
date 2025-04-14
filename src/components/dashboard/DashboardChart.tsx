
import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const data = [
  {
    name: "Jan",
    checked_out: 12,
    checked_in: 10,
    new_items: 5,
  },
  {
    name: "Feb",
    checked_out: 15,
    checked_in: 13,
    new_items: 8,
  },
  {
    name: "Mar",
    checked_out: 18,
    checked_in: 14,
    new_items: 7,
  },
  {
    name: "Apr",
    checked_out: 22,
    checked_in: 19,
    new_items: 12,
  },
  {
    name: "May",
    checked_out: 25,
    checked_in: 23,
    new_items: 9,
  },
  {
    name: "Jun",
    checked_out: 30,
    checked_in: 25,
    new_items: 10,
  },
];

const DashboardChart = () => {
  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis 
            dataKey="name" 
            fontSize={12} 
            tickLine={false}
            axisLine={false} 
          />
          <YAxis 
            fontSize={12} 
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${value}`} 
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'white', 
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              border: '1px solid #eaeaea'
            }} 
          />
          <Legend verticalAlign="top" height={36} />
          <Bar 
            name="Checked Out" 
            dataKey="checked_out" 
            fill="#8884d8" 
            radius={[4, 4, 0, 0]} 
            barSize={8}
          />
          <Bar 
            name="Checked In" 
            dataKey="checked_in" 
            fill="#82ca9d" 
            radius={[4, 4, 0, 0]} 
            barSize={8}
          />
          <Bar 
            name="New Items" 
            dataKey="new_items" 
            fill="#ffc658" 
            radius={[4, 4, 0, 0]} 
            barSize={8}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default DashboardChart;
