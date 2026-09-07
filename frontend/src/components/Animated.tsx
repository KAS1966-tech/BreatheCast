import { motion } from "motion/react"

const Animated: React.FC<{
    children: React.ReactNode;
    delay?: number;
    y?: number;
    x?: number;
    scale?: number;
    className?: string;
}> = ({
    children,
    delay = 0,
    y = 50,
    x = 0,
    scale = 1,
    className = "",
    ...props
}) => {
    return (
        <motion.div
            initial={{ opacity: 0, x, y, scale }}
            whileInView={{ opacity: 1, x: 0, y: 0, scale: 1 }}
            viewport={{ once: true }}
            transition={{
                delay,
                type: "spring",
                stiffness: 320,
                damping: 70,
                mass: 1
            }}
            className={className}
            {...props}
        >
            {children}
        </motion.div>
    )
}

export default Animated
