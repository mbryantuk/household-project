import { Savings } from '@mui/icons-material';
import WidgetWrapper from './WidgetWrapper';
import FinancialCalculatorContent from '../tools/FinancialCalculatorContent';

export default function FinancialWidget() {
  return (
    <WidgetWrapper title="Finance Tools" icon={<Savings />} color="success">
      <FinancialCalculatorContent />
    </WidgetWrapper>
  );
}
